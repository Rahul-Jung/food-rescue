-- T2.6: profile settings and update_my_profile (own row only, validated),
-- plus the phone-change sync from auth.users.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select on ids to authenticated;
insert into ids values
  ('sita', tests.create_user('sita2@example.test')),
  ('ram', tests.create_user('ram2@example.test')),
  ('suspended', tests.create_user('gone2@example.test', 'customer', 'suspended'));

select has_column('public', 'profiles', 'radius_m', 'radius_m column');
select col_default_is('public', 'profiles', 'pickup_reminders', 'true', 'pickup reminders on by default');
select col_default_is('public', 'profiles', 'marketing_pushes', 'false', 'marketing pushes off by default');
select col_default_is('public', 'profiles', 'devanagari_digits', 'false', 'Latin digits by default');

-- Name rule: Devanagari allowed, length checked
select ok(public.is_valid_profile_name('सीता शर्मा'), 'Devanagari name is valid');
select ok(public.is_valid_profile_name('Sita Sharma'), 'Latin name is valid');
select ok(not public.is_valid_profile_name('   '), 'blank name is invalid');
select ok(not public.is_valid_profile_name(repeat('क', 61)), 'name over 60 characters is invalid');

-- Own row
select tests.authenticate_as((select id from ids where name = 'sita'));
select lives_ok(
  $$ select public.update_my_profile(p_full_name => 'सीता शर्मा', p_locale => 'ne', p_radius_m => 3000,
       p_marketing_pushes => true, p_devanagari_digits => true) $$,
  'customer updates own name and settings through the RPC'
);
select is(
  (select row(full_name, locale, radius_m, marketing_pushes, devanagari_digits, pickup_reminders)::text
   from public.profiles where id = (select id from ids where name = 'sita')),
  row('सीता शर्मा', 'ne', 3000, true, true, true)::text,
  'Devanagari name and settings saved; untouched values kept'
);
select throws_ok(
  $$ select public.update_my_profile(p_radius_m => 5000) $$,
  '22023', 'VALIDATION_FAILED',
  'radius must be one of app_settings.radius_options_m'
);
select throws_ok(
  $$ select public.update_my_profile(p_full_name => '<script>') $$,
  '22023', 'VALIDATION_FAILED',
  'bad name is refused'
);
select tests.clear_authentication();

select is(
  (select full_name from public.profiles where id = (select id from ids where name = 'ram')),
  null,
  'another user''s profile is untouched'
);

-- Suspended user cannot edit
select tests.authenticate_as((select id from ids where name = 'suspended'));
select throws_ok(
  $$ select public.update_my_profile(p_full_name => 'X') $$,
  '42501', 'FORBIDDEN',
  'suspended user cannot edit their profile'
);
select tests.clear_authentication();

-- Anonymous visitors cannot call it
set local role anon;
select throws_ok($$ select public.update_my_profile(p_full_name => 'X') $$, '42501', null,
  'anonymous visitors cannot call update_my_profile');
reset role;

-- Phone change confirmed by Auth is copied into the profile
update auth.users set phone = '9779812345670' where id = (select id from ids where name = 'sita');
select is(
  (select phone from public.profiles where id = (select id from ids where name = 'sita')),
  '+9779812345670',
  'confirmed phone change is copied to the profile'
);
update auth.users set email = 'sita.new@example.test' where id = (select id from ids where name = 'sita');
select is(
  (select email from public.profiles where id = (select id from ids where name = 'sita')),
  'sita.new@example.test',
  'email change is copied to the profile'
);

select * from finish();
rollback;
