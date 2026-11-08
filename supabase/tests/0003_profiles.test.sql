begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- Table shape (plan section 5)
select has_table('public', 'profiles', 'profiles table exists');
select col_type_is('public', 'profiles', 'role', 'app_role', 'role is app_role');
select col_default_is('public', 'profiles', 'role', 'customer'::public.app_role, 'role defaults to customer');
select col_type_is('public', 'profiles', 'status', 'account_status', 'status is account_status');

-- On-signup trigger: a new auth user gets a profile
insert into auth.users (id, email, phone, raw_user_meta_data, aud, role)
values (
  '11111111-1111-1111-1111-111111111111',
  'sita@example.com',
  '9779812345678',
  '{"full_name": "Sita Sharma", "locale": "ne", "role": "admin"}',
  'authenticated',
  'authenticated'
);

select ok(
  exists (select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'new auth user gets a profile'
);
select is(
  (select phone from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  '+9779812345678',
  'phone stored in E.164 with +'
);
select is(
  (select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'customer',
  'role from user metadata is ignored; new users are customers'
);
select is(
  (select locale from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'ne',
  'locale taken from sign-up metadata'
);
select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Sita Sharma',
  'full name taken from sign-up metadata'
);

-- Bad metadata falls back safely
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values ('22222222-2222-2222-2222-222222222222', 'ram@example.com', '{"locale": "fr"}', 'authenticated', 'authenticated');
select is(
  (select locale from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'en',
  'unsupported locale falls back to en'
);

-- Custom access token hook: JWT carries app_role and app_status
select is(
  public.custom_access_token_hook(
    '{"user_id": "11111111-1111-1111-1111-111111111111", "claims": {"aal": "aal1", "role": "authenticated"}}'
  ) -> 'claims' ->> 'app_role',
  'customer',
  'JWT carries app_role'
);
select is(
  public.custom_access_token_hook(
    '{"user_id": "11111111-1111-1111-1111-111111111111", "claims": {"aal": "aal1"}}'
  ) -> 'claims' ->> 'app_status',
  'active',
  'JWT carries app_status'
);
select is(
  public.custom_access_token_hook(
    '{"user_id": "11111111-1111-1111-1111-111111111111", "claims": {"aal": "aal1"}}'
  ) -> 'claims' ->> 'aal',
  'aal1',
  'existing claims are kept'
);

update public.profiles set role = 'vendor', status = 'suspended'
where id = '11111111-1111-1111-1111-111111111111';
select is(
  public.custom_access_token_hook('{"user_id": "11111111-1111-1111-1111-111111111111", "claims": {}}') -> 'claims',
  '{"app_role": "vendor", "app_status": "suspended"}'::jsonb,
  'role and status changes show up in the next token'
);

select is(
  public.custom_access_token_hook('{"user_id": "99999999-9999-9999-9999-999999999999", "claims": {}}')
    -> 'claims' ->> 'app_status',
  'deleted',
  'user without a profile fails closed (app_status deleted)'
);

-- Only Supabase Auth may call the hook
set local role authenticated;
select throws_ok(
  $$ select public.custom_access_token_hook('{"user_id": "11111111-1111-1111-1111-111111111111", "claims": {}}') $$,
  '42501', null,
  'app users cannot call the token hook'
);
reset role;

-- Phone must be a Nepal mobile in E.164
select throws_ok(
  $$ update public.profiles set phone = '9812345678' where id = '22222222-2222-2222-2222-222222222222' $$,
  '23514', null,
  'phone without +977 is rejected'
);

-- Deleting the auth user removes the profile
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select ok(
  not exists (select 1 from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'profile is removed with its auth user'
);

select * from finish();
rollback;
