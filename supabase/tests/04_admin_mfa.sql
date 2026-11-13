-- T2.8: admin recovery codes (RLS + one-time use), login audit rows, audit_log read rule.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select on ids to authenticated;
create temp table codes (code text) on commit drop;
grant select, insert on codes to authenticated;
insert into ids values
  ('admin', tests.create_user('admin-t28@example.test', 'admin')),
  ('sita', tests.create_user('sita-t28@example.test'));

-- A verified TOTP factor for the admin (as if enrolled in the admin panel)
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values (gen_random_uuid(), (select id from ids where name = 'admin'), 'phone', 'totp', 'verified', now(), now(), 'X');

-- Recovery codes: only admins with TOTP (aal2) can create them
select tests.authenticate_as((select id from ids where name = 'admin'));
select throws_ok($$ select public.admin_generate_recovery_codes() $$, '42501', 'FORBIDDEN',
  'admin without TOTP (aal1) cannot create recovery codes');
select tests.clear_authentication();

select tests.authenticate_as_admin((select id from ids where name = 'admin'));
insert into codes select unnest(public.admin_generate_recovery_codes());
select is((select count(*)::int from codes), 10, 'admin with TOTP gets 10 recovery codes');
select ok((select bool_and(code ~ '^[A-Z2-9]{5}-[A-Z2-9]{5}$') from codes), 'codes look like ABCDE-FGH23');
select throws_ok($$ select * from public.admin_recovery_codes $$, '42501', null,
  'not even the admin can read the code table directly');
select tests.clear_authentication();

select is((select count(*)::int from public.admin_recovery_codes
           where user_id = (select id from ids where name = 'admin')), 10, '10 codes stored');
select ok(not exists (select 1 from public.admin_recovery_codes c join codes p on c.code_hash = p.code),
  'codes are stored hashed, never in plain text');

-- Customers cannot use it
select tests.authenticate_as((select id from ids where name = 'sita'));
select throws_ok($$ select public.admin_redeem_recovery_code('AAAAA-AAAAA') $$, '42501', 'FORBIDDEN',
  'customer cannot redeem recovery codes');
select is_empty($$ select * from public.audit_log $$, 'customer sees no audit_log rows');
select tests.clear_authentication();

-- Lost authenticator: admin with only email + password (aal1) uses a code
select tests.authenticate_as((select id from ids where name = 'admin'));
select is(public.admin_redeem_recovery_code('wrong-codes'), false, 'wrong code is refused');
select is(public.admin_redeem_recovery_code(lower((select code from codes limit 1))), true,
  'a valid code works (case and dash insensitive)');
select is(public.admin_redeem_recovery_code((select code from codes limit 1)), false,
  'a used code cannot be used again');
select tests.clear_authentication();

select ok(not exists (select 1 from auth.mfa_factors where user_id = (select id from ids where name = 'admin')),
  'redeeming removes the lost TOTP factor so a new one can be enrolled');
select is((select count(*)::int from public.admin_recovery_codes
           where user_id = (select id from ids where name = 'admin') and used_at is null), 9,
  '9 unused codes left');

-- Login audit: only after TOTP (aal2)
select tests.authenticate_as((select id from ids where name = 'admin'));
select throws_ok($$ select public.admin_log_login('203.0.113.7', 'Firefox') $$, '42501', 'FORBIDDEN',
  'no login audit without TOTP');
select tests.clear_authentication();

select tests.authenticate_as_admin((select id from ids where name = 'admin'));
select lives_ok($$ select public.admin_log_login('203.0.113.7', 'Mozilla/5.0 Firefox') $$,
  'admin with TOTP logs the login');
select is(
  (select row(action, host(ip), user_agent)::text from public.audit_log
   where actor_id = (select id from ids where name = 'admin') and action = 'admin_login'),
  row('admin_login', '203.0.113.7', 'Mozilla/5.0 Firefox')::text,
  'audit_log row has actor, IP and user agent (and the admin can read it)'
);
select lives_ok($$ select public.admin_log_login('not-an-ip', 'x') $$, 'a bad IP is stored as empty, not an error');
select throws_ok($$ update public.audit_log set action = 'x' $$, '42501', null,
  'audit_log stays insert-only for admins');
select tests.clear_authentication();

select is(
  (select count(*)::int from public.audit_log
   where actor_id = (select id from ids where name = 'admin')
     and action in ('admin_recovery_code_used', 'admin_recovery_code_failed')),
  3,
  'code use (and failed tries) are audited'
);

select * from finish();
rollback;
