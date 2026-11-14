-- T4.6 done-when: a 9 pm–1 am deal is live at 00:30 Saturday from Friday's
-- window; a paused deal is never live. Plus upsert_deal rules.
-- 2026-11-13 is a Friday (Asia/Kathmandu, +05:45).
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select, insert on ids to authenticated;
insert into ids values ('shop', tests.create_user('shop@example.test', 'vendor'));
insert into public.vendors (owner_id, name, status)
values ((select id from ids where name = 'shop'), 'Bar Nepal', 'approved');

select tests.authenticate_as((select id from ids where name = 'shop'));

-- upsert_deal rules -------------------------------------------------------------------
select throws_ok(
  $$ select public.upsert_deal(null, '{"title": "Late happy hour", "deal_discount_pct": 25}', '[]') $$,
  '22023', 'VALIDATION_FAILED', 'at least one window'
);
select throws_ok(
  $$ select public.upsert_deal(null, '{"title": "Late happy hour", "deal_discount_pct": 25}',
       '[{"day_of_week": 5, "start_time": "21:00", "end_time": "21:00"}]') $$,
  '22023', 'VALIDATION_FAILED', 'a window cannot end when it starts'
);
select throws_ok(
  $$ select public.upsert_deal(null, '{"title": "Late happy hour"}',
       '[{"day_of_week": 5, "start_time": "21:00", "end_time": "01:00"}]') $$,
  '22023', 'VALIDATION_FAILED', 'needs a discount % or a deal price'
);
select throws_ok(
  $$ select public.upsert_deal(null, '{"title": "Late happy hour", "original_price": 50000, "price": 60000}',
       '[{"day_of_week": 5, "start_time": "21:00", "end_time": "01:00"}]') $$,
  '22023', 'VALIDATION_FAILED', 'deal price must be below the original'
);
select lives_ok(
  $$ insert into ids select 'd', (public.upsert_deal(null,
       '{"title": "Late happy hour", "deal_discount_pct": 25, "description": "Drinks 25% off"}',
       '[{"day_of_week": 5, "start_time": "21:00", "end_time": "01:00"},
         {"day_of_week": 2, "start_time": "17:00", "end_time": "19:00"}]')).id $$,
  'deal with two windows saved'
);
select is((select count(*)::int from public.deal_schedules where offer_id = (select id from ids where name = 'd')), 2,
  'both windows stored');
select is((select status::text from public.offers where id = (select id from ids where name = 'd')), 'draft',
  'a new deal is a draft');

-- Publish (needs a photo) -----------------------------------------------------------------
select tests.clear_authentication();
insert into storage.objects (bucket_id, name)
select 'public-images', format('offers/%s/%s/0.webp', o.vendor_id, o.id)
from public.offers o where o.id = (select id from ids where name = 'd');
select tests.authenticate_as((select id from ids where name = 'shop'));
select public.confirm_offer_images((select id from ids where name = 'd'), array[0]);
select lives_ok($$ select public.set_offer_status((select id from ids where name = 'd'), 'live') $$, 'deal published');

-- is_deal_live --------------------------------------------------------------------------
select ok(public.is_deal_live((select id from ids where name = 'd'), '2026-11-13 21:30+05:45'),
  'live on Friday at 21:30');
select ok(public.is_deal_live((select id from ids where name = 'd'), '2026-11-14 00:30+05:45'),
  'live at 00:30 Saturday from Friday''s 9 pm–1 am window');
select ok(not public.is_deal_live((select id from ids where name = 'd'), '2026-11-14 01:00+05:45'),
  'not live at 01:00 (end is exclusive)');
select ok(not public.is_deal_live((select id from ids where name = 'd'), '2026-11-13 20:59+05:45'),
  'not live before 21:00');
select ok(not public.is_deal_live((select id from ids where name = 'd'), '2026-11-15 00:30+05:45'),
  'not live at 00:30 Sunday (no Saturday window)');
select ok(public.is_deal_live((select id from ids where name = 'd'), '2026-11-10 17:15+05:45'),
  'second window: Tuesday 17:15');
select ok(public.is_deal_live((select id from ids where name = 'd'), '2026-11-13 15:30Z'),
  'times are read in Nepal time: 15:30 UTC is 21:15 NPT Friday, so live');

-- Paused deal is never live ---------------------------------------------------------------------
select lives_ok($$ select public.set_offer_status((select id from ids where name = 'd'), 'deactivated') $$, 'pause');
select ok(not public.is_deal_live((select id from ids where name = 'd'), '2026-11-13 21:30+05:45'),
  'a paused deal is never live');

select tests.clear_authentication();
select * from finish();
rollback;
