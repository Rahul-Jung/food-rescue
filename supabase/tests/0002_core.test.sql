begin;
-- pgtap is created here as well as in 0001, so tests still run where the
-- production post-deploy step has dropped it (see supabase/production-post-deploy.sql).
create extension if not exists pgtap with schema extensions;
select plan(15);

-- Extensions
select has_extension('postgis');
select has_extension('pg_cron');

-- Enums
select enum_has_labels('public', 'order_status', array[
  'pending_payment', 'paid', 'collected', 'no_show',
  'cancelled_by_customer', 'cancelled_by_vendor', 'refunded', 'expired_hold'
]);

-- app_settings seeded
select is(public.app_setting('hold_minutes'), '10'::jsonb, 'hold_minutes default is 10');
select is(public.app_setting('default_commission_bp'), '1200'::jsonb, 'commission default is 1200 bp');
select is(public.app_setting('min_withdrawal_paisa'), '50000'::jsonb, 'min withdrawal is Rs. 500 in paisa');
select throws_ok($$ select public.app_setting('no_such_key') $$, 'P0002', null, 'missing key raises');

-- Public view hides internal keys
select ok(exists(select 1 from public.app_settings_public where key = 'maintenance'), 'public key visible');
select ok(not exists(select 1 from public.app_settings_public where key = 'pickup_code_tries'), 'internal key hidden');

-- now_npt is Kathmandu wall time (UTC+05:45)
select is(public.now_npt(), (now() at time zone 'UTC') + interval '5 hours 45 minutes', 'now_npt is UTC+05:45');

-- Apps cannot touch the tables directly
set local role anon;
select throws_ok($$ select * from public.app_settings $$, '42501', null, 'anon cannot read app_settings');
select lives_ok($$ select * from public.app_settings_public $$, 'anon can read app_settings_public');
select throws_ok($$ select public.app_setting('hold_minutes') $$, '42501', null, 'anon cannot call app_setting');
reset role;

-- audit_log is insert-only, even for the owner
insert into public.audit_log (action, entity, entity_id) values ('test', 'app_settings', 'hold_minutes');
select throws_ok($$ update public.audit_log set action = 'x' $$, '42501', null, 'audit_log update blocked');
select throws_ok($$ delete from public.audit_log $$, '42501', null, 'audit_log delete blocked');

select * from finish();
rollback;
