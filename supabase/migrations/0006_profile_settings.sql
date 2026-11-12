-- 0006_profile_settings (T2.6): settings stored on the profile (C-25) and the
-- one RPC the app uses to edit its own profile (CLAUDE.md: the app never
-- writes tables directly).

alter table public.profiles
  add column radius_m int not null default 2000 check (radius_m between 500 and 10000),
  add column pickup_reminders boolean not null default true,
  add column marketing_pushes boolean not null default false,
  add column devanagari_digits boolean not null default false;

-- Name rule shared with the app (profileNameSchema): 1-60 characters; any
-- script (Devanagari letters and vowel signs included); no digits, control
-- characters or ASCII symbols except space . ' -
-- (A block list, because the DB's [[:alpha:]] is ASCII-only under the C locale.)
create function public.is_valid_profile_name(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_name is not null
     and char_length(btrim(p_name)) between 1 and 60
     and btrim(p_name) !~ '[[:cntrl:]0-9!"#$%&()*+,/:;<=>?@\[\\\]^_`{|}~]';
$$;

-- Edit own profile (C-24 / C-25). Null means "leave as is". Runs as the
-- caller, so RLS (own row, active users only) and the column guard apply.
create function public.update_my_profile(
  p_full_name text default null,
  p_locale text default null,
  p_radius_m int default null,
  p_pickup_reminders boolean default null,
  p_marketing_pushes boolean default null,
  p_devanagari_digits boolean default null
)
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles;
  v_radii jsonb := public.app_setting_public_value('radius_options_m');
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if p_full_name is not null and not public.is_valid_profile_name(p_full_name) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'full_name';
  end if;
  if p_locale is not null and p_locale not in ('en', 'ne') then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'locale';
  end if;
  if p_radius_m is not null and not (v_radii @> to_jsonb(p_radius_m)) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'radius_m';
  end if;

  update public.profiles p
  set full_name = coalesce(btrim(p_full_name), p.full_name),
      locale = coalesce(p_locale, p.locale),
      radius_m = coalesce(p_radius_m, p.radius_m),
      pickup_reminders = coalesce(p_pickup_reminders, p.pickup_reminders),
      marketing_pushes = coalesce(p_marketing_pushes, p.marketing_pushes),
      devanagari_digits = coalesce(p_devanagari_digits, p.devanagari_digits)
  where p.id = v_uid
  returning p.* into v_row;

  if v_row.id is null then
    -- No visible own row: suspended / deleted users match no policy.
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return v_row;
end;
$$;

-- Public setting values are readable by the caller through the view; this
-- helper keeps update_my_profile free of the internal app_setting() grant.
create function public.app_setting_public_value(p_key text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select s.value from public.app_settings_public s where s.key = p_key;
$$;

revoke execute on function public.update_my_profile(text, text, int, boolean, boolean, boolean) from public, anon;
grant execute on function public.update_my_profile(text, text, int, boolean, boolean, boolean) to authenticated;
grant execute on function public.app_setting_public_value(text) to authenticated, service_role;
grant execute on function public.is_valid_profile_name(text) to authenticated, service_role;

-- Phone change (C-24): once Auth confirms the OTP sent to the new number, copy
-- the new phone (and email) into the profile. Runs as the auth admin, so the
-- column guard does not apply.
create function public.handle_user_contact_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := nullif(new.phone, '');
begin
  if v_phone is not null and left(v_phone, 1) <> '+' then
    v_phone := '+' || v_phone;
  end if;
  if v_phone !~ '^\+9779[78][0-9]{8}$' then
    v_phone := null;
  end if;
  update public.profiles
  set phone = v_phone,
      email = nullif(new.email, '')
  where id = new.id;
  return new;
end;
$$;

revoke execute on function public.handle_user_contact_change() from public, anon, authenticated;

create trigger on_auth_user_contact_changed
  after update of phone, email on auth.users
  for each row
  when (old.phone is distinct from new.phone or old.email is distinct from new.email)
  execute function public.handle_user_contact_change();
