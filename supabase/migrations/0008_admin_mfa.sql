-- 0008_admin_mfa (T2.8): admin login support.
--   * Recovery codes: Supabase Auth has no recovery codes, so admins get 10
--     one-time codes, stored only as SHA-256 hashes. A code removes the lost
--     TOTP factor so the admin can enrol a new one (no service role needed).
--   * admin_log_login: audit_log row after a successful TOTP login (aal2),
--     with IP and user agent (plan section 8).
--   * audit_log readable by admins with aal2 (RLS matrix: Admin = Read).

create table public.admin_recovery_codes (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, code_hash)
);

alter table public.admin_recovery_codes enable row level security;
-- No policies and no grants: only the SECURITY DEFINER functions below touch it.
revoke all on public.admin_recovery_codes from anon, authenticated;

create function public.recovery_code_hash(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- Codes are normalised (upper case, no spaces or dashes) before hashing.
  select encode(extensions.digest(upper(regexp_replace(p_code, '[\s-]', '', 'g')), 'sha256'), 'hex');
$$;

revoke execute on function public.recovery_code_hash(text) from public, anon, authenticated;

-- Admin with TOTP (aal2) makes a fresh set of 10 codes; old ones stop working.
-- Returns the plain codes once (shown to the admin, never stored).
create function public.admin_generate_recovery_codes()
returns text[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_codes text[] := '{}';
  v_code text;
  -- Crockford-style alphabet: no 0/O or 1/I/L confusion
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
begin
  if v_uid is null or not public.jwt_is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  delete from public.admin_recovery_codes where user_id = v_uid;
  for i in 1..10 loop
    v_bytes := extensions.gen_random_bytes(10);
    v_code := '';
    for j in 0..9 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, j) % length(v_alphabet)) + 1, 1);
    end loop;
    v_code := substr(v_code, 1, 5) || '-' || substr(v_code, 6, 5);
    insert into public.admin_recovery_codes (user_id, code_hash)
    values (v_uid, public.recovery_code_hash(v_code));
    v_codes := v_codes || v_code;
  end loop;

  insert into public.audit_log (actor_id, action, entity, entity_id)
  values (v_uid, 'admin_recovery_codes_created', 'auth', v_uid::text);
  return v_codes;
end;
$$;

-- Lost authenticator: an admin signed in with email + password (aal1) uses one
-- code. It is marked used, the user's TOTP factors are removed, and the admin
-- is sent to enrol a new authenticator. Returns false for a wrong / used code.
create function public.admin_redeem_recovery_code(p_code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id bigint;
begin
  if v_uid is null
     or coalesce(auth.jwt() ->> 'app_role', '') <> 'admin'
     or not public.jwt_is_active() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.admin_recovery_codes
  set used_at = now()
  where user_id = v_uid
    and used_at is null
    and code_hash = public.recovery_code_hash(p_code)
  returning id into v_id;

  if v_id is null then
    insert into public.audit_log (actor_id, action, entity, entity_id)
    values (v_uid, 'admin_recovery_code_failed', 'auth', v_uid::text);
    return false;
  end if;

  delete from auth.mfa_factors where user_id = v_uid;
  insert into public.audit_log (actor_id, action, entity, entity_id)
  values (v_uid, 'admin_recovery_code_used', 'auth', v_uid::text);
  return true;
end;
$$;

-- Admin login audit (AD-01): only after TOTP (aal2). IP and user agent come
-- from the admin server (route handler), not the browser.
create function public.admin_log_login(p_ip text default null, p_user_agent text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ip inet;
begin
  if v_uid is null or not public.jwt_is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  begin
    v_ip := nullif(btrim(p_ip), '')::inet;
  exception when others then
    v_ip := null;
  end;
  insert into public.audit_log (actor_id, action, entity, entity_id, ip, user_agent)
  values (v_uid, 'admin_login', 'auth', v_uid::text, v_ip, left(p_user_agent, 500));
end;
$$;

revoke execute on function public.admin_generate_recovery_codes() from public, anon;
revoke execute on function public.admin_redeem_recovery_code(text) from public, anon;
revoke execute on function public.admin_log_login(text, text) from public, anon;
grant execute on function public.admin_generate_recovery_codes() to authenticated;
grant execute on function public.admin_redeem_recovery_code(text) to authenticated;
grant execute on function public.admin_log_login(text, text) to authenticated;

-- RLS matrix: audit_log, Admin = Read (with TOTP). Still insert-only for all.
grant select on public.audit_log to authenticated;
create policy "audit_log: admin reads"
  on public.audit_log for select to authenticated
  using ((select public.jwt_is_admin()));
