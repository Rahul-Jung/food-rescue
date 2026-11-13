begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select ok(
  exists (select 1 from public.app_settings_public where key = 'support_phone'),
  'support phone is a public setting'
);
select ok(
  exists (select 1 from public.app_settings_public where key = 'support_email'),
  'support email is a public setting'
);

-- A suspended user (no profile access) can still read the support contact.
select tests.authenticate_as(tests.create_user('blocked-support@example.test', 'customer', 'suspended'));
select is(
  (select count(*)::int from public.app_settings_public where key in ('support_phone', 'support_email')),
  2,
  'suspended user can read the support contact'
);
select tests.clear_authentication();

select * from finish();
rollback;
