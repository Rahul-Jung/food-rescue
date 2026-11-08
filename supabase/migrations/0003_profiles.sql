-- 0003_profiles: profiles, on-signup trigger, custom access token hook
-- (adds app_role and app_status to the JWT). Plan sections 5 and 8.
-- Base RLS policies on profiles are added in T2.2.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'customer',
  full_name text,
  -- E.164 Nepal mobile, same rule as npPhoneSchema in packages/shared
  phone text unique check (phone ~ '^\+9779[78][0-9]{8}$'),
  email text,
  avatar_url text,
  locale text not null default 'en' check (locale in ('en', 'ne')),
  status public.account_status not null default 'active',
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- app_settings.updated_by now has a table to point at (0002 left it without a FK).
alter table public.app_settings
  add constraint app_settings_updated_by_fkey foreign key (updated_by) references public.profiles (id) on delete set null;

-- On-signup trigger -------------------------------------------------------------
-- Every new auth user gets a profile. The role always starts as customer:
-- it is never taken from user metadata (a client could put "admin" there).
-- Vendors get their role from the business sign-up RPC (V-01, later task).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_locale text;
begin
  -- auth.users stores phone without the '+'; keep only a valid Nepal mobile.
  v_phone := nullif(new.phone, '');
  if v_phone is not null and left(v_phone, 1) <> '+' then
    v_phone := '+' || v_phone;
  end if;
  if v_phone !~ '^\+9779[78][0-9]{8}$' then
    v_phone := null;
  end if;

  v_locale := new.raw_user_meta_data ->> 'locale';
  if v_locale is null or v_locale not in ('en', 'ne') then
    v_locale := 'en';
  end if;

  insert into public.profiles (id, full_name, phone, email, locale)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    v_phone,
    nullif(new.email, ''),
    v_locale
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Custom access token hook -----------------------------------------------------
-- Called by Supabase Auth before every token is issued. Fails closed: a user
-- without a profile gets app_status 'deleted', which every policy rejects.
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_claims jsonb;
  v_role public.app_role;
  v_status public.account_status;
begin
  select p.role, p.status into v_role, v_status
  from public.profiles p
  where p.id = (event ->> 'user_id')::uuid;

  v_claims := coalesce(event -> 'claims', '{}'::jsonb);
  v_claims := jsonb_set(v_claims, '{app_role}', to_jsonb(coalesce(v_role, 'customer'::public.app_role)));
  v_claims := jsonb_set(v_claims, '{app_status}', to_jsonb(coalesce(v_status, 'deleted'::public.account_status)));
  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- Only Supabase Auth may run the hook, and it may only read profiles.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant select on table public.profiles to supabase_auth_admin;

create policy "auth admin reads profiles for the token hook"
  on public.profiles
  as permissive
  for select
  to supabase_auth_admin
  using (true);
