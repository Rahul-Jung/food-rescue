-- T2.2 done-when: a customer cannot read or change another profile, or their
-- own role and status. Plus the other rows of the RLS matrix for profiles.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select on ids to authenticated;
insert into ids values
  ('sita', tests.create_user('sita@example.test')),
  ('ram', tests.create_user('ram@example.test')),
  ('vendor', tests.create_user('shop@example.test', 'vendor')),
  ('admin', tests.create_user('admin@example.test', 'admin')),
  ('suspended', tests.create_user('gone@example.test', 'customer', 'suspended'));

-- Customer ------------------------------------------------------------------
select tests.authenticate_as((select id from ids where name = 'sita'));

select is((select count(*)::int from public.profiles), 1, 'customer sees exactly one profile');
select is(
  (select id from public.profiles),
  (select id from ids where name = 'sita'),
  'that profile is their own'
);
select is_empty(
  $$ select 1 from public.profiles where id = (select id from ids where name = 'ram') $$,
  'customer cannot read another profile'
);

select lives_ok(
  $$ update public.profiles set full_name = 'Sita S', locale = 'ne' where id = (select id from ids where name = 'sita') $$,
  'customer can update own name and language'
);
select is(
  (select full_name from public.profiles where id = (select id from ids where name = 'sita')),
  'Sita S',
  'own update saved'
);

update public.profiles set full_name = 'Hacked' where id = (select id from ids where name = 'ram');

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = (select id from ids where name = 'sita') $$,
  '42501', 'FORBIDDEN',
  'customer cannot change own role'
);
select throws_ok(
  $$ update public.profiles set status = 'active', role = 'vendor' where id = (select id from ids where name = 'sita') $$,
  '42501', 'FORBIDDEN',
  'customer cannot change own role together with other fields'
);
select throws_ok(
  $$ update public.profiles set status = 'suspended' where id = (select id from ids where name = 'sita') $$,
  '42501', 'FORBIDDEN',
  'customer cannot change own status'
);
select throws_ok(
  $$ update public.profiles set phone = '+9779800000000' where id = (select id from ids where name = 'sita') $$,
  '42501', 'FORBIDDEN',
  'customer cannot change own phone directly (needs new OTP)'
);
select throws_ok(
  $$ insert into public.profiles (id) values (gen_random_uuid()) $$,
  '42501', null,
  'customer cannot insert profiles'
);
select throws_ok(
  $$ delete from public.profiles where id = (select id from ids where name = 'sita') $$,
  '42501', null,
  'customer cannot delete profiles'
);
select tests.clear_authentication();

select is(
  (select full_name from public.profiles where id = (select id from ids where name = 'ram')),
  null,
  'customer update of another profile changed nothing'
);
select is(
  (select role::text from public.profiles where id = (select id from ids where name = 'sita')),
  'customer',
  'customer role unchanged after attempts'
);

-- Vendor: same as customer ---------------------------------------------------
select tests.authenticate_as((select id from ids where name = 'vendor'));
select is((select count(*)::int from public.profiles), 1, 'vendor sees only own profile');
select throws_ok(
  $$ update public.profiles set status = 'active', role = 'admin' where id = (select id from ids where name = 'vendor') $$,
  '42501', 'FORBIDDEN',
  'vendor cannot change own role'
);
select tests.clear_authentication();

-- Admin needs aal2 (TOTP) -----------------------------------------------------
select tests.authenticate_as((select id from ids where name = 'admin'));
select is((select count(*)::int from public.profiles), 1, 'admin without TOTP (aal1) sees only own profile');
select tests.clear_authentication();

select tests.authenticate_as_admin((select id from ids where name = 'admin'));
select ok((select count(*)::int from public.profiles) >= 5, 'admin with TOTP (aal2) reads all profiles');
select lives_ok(
  $$ update public.profiles set status = 'suspended' where id = (select id from ids where name = 'ram') $$,
  'admin with TOTP can change another user''s status'
);
select tests.clear_authentication();
select is(
  (select status::text from public.profiles where id = (select id from ids where name = 'ram')),
  'suspended',
  'admin status change saved'
);

-- Suspended users fail every policy ---------------------------------------------
select tests.authenticate_as((select id from ids where name = 'suspended'));
select is_empty($$ select 1 from public.profiles $$, 'suspended user cannot read even own profile');
select tests.clear_authentication();

-- Anonymous visitors -----------------------------------------------------------
set local role anon;
select throws_ok($$ select 1 from public.profiles $$, '42501', null, 'anonymous visitors cannot read profiles');
reset role;

-- Token hook still reads profiles under RLS ---------------------------------------
select is(
  public.custom_access_token_hook(
    jsonb_build_object('user_id', (select id from ids where name = 'vendor'), 'claims', '{}'::jsonb)
  ) -> 'claims' ->> 'app_role',
  'vendor',
  'token hook still sees roles with RLS on'
);

select * from finish();
rollback;
