-- 0004_profiles_rls: base RLS on profiles (T2.2, plan section 8 RLS matrix).
--   Customer / vendor: read and update own row, except role and status.
--   Admin (aal2): all.
--   Suspended or deleted users fail every policy.
-- (The plan groups these with 0003; 0003 was already applied to staging, so
-- this task adds its own numbered migration, as section 5 describes.)

-- Claim helpers used by policies (JWT claims come from custom_access_token_hook).
create function public.jwt_is_active()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'app_status', '') = 'active';
$$;

create function public.jwt_is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.jwt_is_active()
     and coalesce(auth.jwt() ->> 'app_role', '') = 'admin'
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

grant execute on function public.jwt_is_active() to authenticated, service_role;
grant execute on function public.jwt_is_admin() to authenticated, service_role;
revoke execute on function public.jwt_is_active() from public, anon;
revoke execute on function public.jwt_is_admin() from public, anon;

-- Table privileges: no anonymous access; rows are created only by the
-- sign-up trigger and never deleted from the app (account deletion is an RPC).
revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;

create policy "profiles: read own row"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) and (select public.jwt_is_active()));

create policy "profiles: admin reads all"
  on public.profiles for select to authenticated
  using ((select public.jwt_is_admin()));

create policy "profiles: update own row"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and (select public.jwt_is_active()))
  with check (id = (select auth.uid()) and (select public.jwt_is_active()));

create policy "profiles: admin updates all"
  on public.profiles for update to authenticated
  using ((select public.jwt_is_admin()))
  with check ((select public.jwt_is_admin()));

-- Column guard: app users may change only their own editable fields.
-- role and status are admin-only (plan). phone, email and deleted_at also stay
-- out of reach: they change through Supabase Auth (new OTP) and the
-- account-deletion RPC, not by editing the row. Triggers and SECURITY DEFINER
-- functions run as other roles and are not affected.
create function public.profiles_guard_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.jwt_is_admin() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.phone is distinct from old.phone
     or new.email is distinct from old.email
     or new.deleted_at is distinct from old.deleted_at
     or new.created_at is distinct from old.created_at then
    raise exception 'FORBIDDEN' using errcode = '42501',
      detail = 'role, status, phone, email and deleted_at cannot be changed here';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_columns();
