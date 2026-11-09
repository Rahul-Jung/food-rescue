-- pgTAP role helpers (T2.2). Committed (not rolled back) so later test files
-- can use them; runs before 01_*.sql because files run in name order.
--   tests.create_user(email, role)          -> uuid of a new auth user + profile
--   tests.authenticate_as(user_id, aal)     -> act as that user (role authenticated,
--                                              JWT claims built by the real token hook)
--   tests.authenticate_as_admin(user_id)    -> same with aal2 (TOTP verified)
--   tests.clear_authentication()            -> back to the test runner's role
begin;
create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to authenticated, anon;

create or replace function tests.create_user(
  p_email text,
  p_role public.app_role default 'customer',
  p_status public.account_status default 'active'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (v_id, p_email, '{}'::jsonb, 'authenticated', 'authenticated');
  update public.profiles set role = p_role, status = p_status where id = v_id;
  return v_id;
end;
$$;

create or replace function tests.authenticate_as(p_user uuid, p_aal text default 'aal1')
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_claims jsonb;
begin
  -- Build claims exactly as Supabase Auth would, through the real hook.
  v_claims := public.custom_access_token_hook(jsonb_build_object(
    'user_id', p_user,
    'claims', jsonb_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)
  )) -> 'claims';
  perform set_config('request.jwt.claims', v_claims::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  execute 'set local role authenticated';
end;
$$;

create or replace function tests.authenticate_as_admin(p_user uuid)
returns void
language sql
set search_path = ''
as $$
  select tests.authenticate_as(p_user, 'aal2');
$$;

create or replace function tests.clear_authentication()
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'reset role';
end;
$$;

select plan(4);
select has_function('tests', 'create_user', 'helper: create_user');
select has_function('tests', 'authenticate_as', 'helper: authenticate_as');
select has_function('tests', 'authenticate_as_admin', 'helper: authenticate_as_admin');
select has_function('tests', 'clear_authentication', 'helper: clear_authentication');
select * from finish();
commit;
