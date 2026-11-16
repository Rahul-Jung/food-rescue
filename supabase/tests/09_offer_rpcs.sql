-- T4.2 done-when: pgTAP for each edge case in V1 to V4; STALE_VERSION on a
-- second device. Also confirm_offer_images (draft until images confirm),
-- expire_offers (T4.7) and vendor_dashboard (T4.8).
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select, insert on ids to authenticated;
insert into ids values
  ('shop', tests.create_user('shop@example.test', 'vendor')),
  ('other', tests.create_user('other@example.test', 'vendor')),
  ('waiting', tests.create_user('wait@example.test', 'vendor')),
  ('customer', tests.create_user('sita@example.test'));
with v as (
  insert into public.vendors (owner_id, name, status, location)
  values ((select id from ids where name = 'shop'), 'Momo Ghar', 'approved',
          extensions.st_geogfromtext('SRID=4326;POINT(85.31 27.71)'))
  returning id
) insert into ids select 'v', id from v;
with v as (
  insert into public.vendors (owner_id, name, status)
  values ((select id from ids where name = 'other'), 'Other', 'approved') returning id
) insert into ids select 'v_other', id from v;
insert into public.vendors (owner_id, name, status)
values ((select id from ids where name = 'waiting'), 'Waiting', 'submitted');

create function pg_temp.offer_json(p jsonb default '{}')
returns jsonb language sql as $$
  select jsonb_build_object(
    'title', 'Veg momo box', 'food_type', 'veg', 'ingredients', 'flour, cabbage',
    'weight_g', 400, 'original_price', 30000, 'price', 15000, 'quantity_total', 5,
    'pickup_start', now() + interval '1 hour',
    'pickup_end', now() + interval '3 hours',
    'expires_at', now() + interval '2 hours'
  ) || p;
$$;
grant execute on function pg_temp.offer_json(jsonb) to authenticated;

-- create_offer -----------------------------------------------------------------------
select tests.authenticate_as((select id from ids where name = 'waiting'));
select throws_ok($$ select public.create_offer(pg_temp.offer_json()) $$, '42501', 'VENDOR_NOT_APPROVED',
  'an unapproved vendor cannot post');
select tests.clear_authentication();

select tests.authenticate_as((select id from ids where name = 'customer'));
select throws_ok($$ select public.create_offer(pg_temp.offer_json()) $$, '42501', 'FORBIDDEN',
  'a customer cannot post');
select tests.clear_authentication();

select tests.authenticate_as((select id from ids where name = 'shop'));
select lives_ok(
  $$ insert into ids select 'o', (public.create_offer(pg_temp.offer_json())).id $$,
  'approved vendor creates an offer'
);
select is((select status::text from public.offers where id = (select id from ids where name = 'o')), 'draft',
  'a new offer starts as a draft');
select throws_ok($$ select public.create_offer(pg_temp.offer_json('{"price": 30000}')) $$,
  '22023', 'VALIDATION_FAILED', 'V1: price must be below original');
select throws_ok(
  $$ select public.create_offer(pg_temp.offer_json(jsonb_build_object('pickup_start', now() - interval '3 hours', 'pickup_end', now() - interval '1 hour', 'expires_at', now() - interval '2 hours'))) $$,
  '22023', 'VALIDATION_FAILED', 'V1: pickup end must be in the future');
select throws_ok(
  $$ select public.create_offer(pg_temp.offer_json(jsonb_build_object('pickup_end', now() + interval '30 minutes'))) $$,
  '22023', 'VALIDATION_FAILED', 'V1: pickup end after start');
select throws_ok(
  $$ select public.create_offer(pg_temp.offer_json(jsonb_build_object('expires_at', now() + interval '4 hours'))) $$,
  '22023', 'VALIDATION_FAILED', 'V1/BR3: expiry no later than pickup end');
select throws_ok($$ select public.create_offer(pg_temp.offer_json('{"food_type": "meat"}')) $$,
  '22023', 'VALIDATION_FAILED', 'V1: food type must be veg, non_veg or vegan');
select throws_ok($$ select public.create_offer(pg_temp.offer_json('{"quantity_total": 0}')) $$,
  '22023', 'VALIDATION_FAILED', 'V1: quantity at least 1');

-- Publish needs a confirmed photo ------------------------------------------------------
select throws_ok($$ select public.set_offer_status((select id from ids where name = 'o'), 'live') $$,
  '22023', 'VALIDATION_FAILED', 'cannot publish without a photo');
select throws_ok($$ select public.confirm_offer_images((select id from ids where name = 'o'), array[0]) $$,
  '22023', 'VALIDATION_FAILED', 'a photo that was not uploaded cannot be confirmed');
select tests.clear_authentication();
insert into storage.objects (bucket_id, name)
select 'public-images', format('offers/%s/%s/0.webp', (select id from ids where name = 'v'), (select id from ids where name = 'o'));
select tests.authenticate_as((select id from ids where name = 'shop'));
select lives_ok($$ select public.confirm_offer_images((select id from ids where name = 'o'), array[0]) $$,
  'an uploaded photo is confirmed');
select lives_ok($$ select public.set_offer_status((select id from ids where name = 'o'), 'live') $$,
  'the offer is published');
select is((select status::text from public.offers where id = (select id from ids where name = 'o')), 'live', 'it is live');

-- Another vendor cannot touch it ------------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as((select id from ids where name = 'other'));
select throws_ok($$ select public.set_offer_status((select id from ids where name = 'o'), 'deactivated') $$,
  '42501', 'FORBIDDEN', 'another vendor cannot change the offer');
select tests.clear_authentication();

-- update_offer: version, quantity floor, extend-only ---------------------------------------
select tests.authenticate_as((select id from ids where name = 'shop'));
select lives_ok(
  $$ select public.update_offer((select id from ids where name = 'o'),
       (select version from public.offers where id = (select id from ids where name = 'o')),
       '{"price": 12000}') $$,
  'first device saves'
);
select throws_ok(
  $$ select public.update_offer((select id from ids where name = 'o'),
       (select version from public.offers where id = (select id from ids where name = 'o')) - 1,
       '{"price": 11000}') $$,
  '22023', 'STALE_VERSION', 'second device with the old version gets STALE_VERSION'
);
select tests.clear_authentication();
update public.offers set quantity_reserved = 3 where id = (select id from ids where name = 'o');
select tests.authenticate_as((select id from ids where name = 'shop'));
select throws_ok(
  $$ select public.update_offer((select id from ids where name = 'o'),
       (select version from public.offers where id = (select id from ids where name = 'o')),
       '{"quantity_total": 2}') $$,
  '22023', 'VALIDATION_FAILED', 'V2: quantity cannot drop below what is reserved'
);
select throws_ok(
  $$ select public.update_offer((select id from ids where name = 'o'),
       (select version from public.offers where id = (select id from ids where name = 'o')),
       jsonb_build_object('pickup_end', (select pickup_end - interval '30 minutes' from public.offers where id = (select id from ids where name = 'o')))) $$,
  '22023', 'VALIDATION_FAILED', 'with reservations the pickup window cannot shrink'
);
select lives_ok(
  $$ select public.update_offer((select id from ids where name = 'o'),
       (select version from public.offers where id = (select id from ids where name = 'o')),
       jsonb_build_object('pickup_end', (select pickup_end + interval '30 minutes' from public.offers where id = (select id from ids where name = 'o')),
                          'quantity_total', 3)) $$,
  'extending the window and lowering quantity to the reserved count works'
);
select is((select status::text from public.offers where id = (select id from ids where name = 'o')), 'sold_out',
  'all units reserved -> sold out');
select lives_ok(
  $$ select public.update_offer((select id from ids where name = 'o'),
       (select version from public.offers where id = (select id from ids where name = 'o')),
       '{"quantity_total": 6}') $$,
  'adding units'
);
select is((select status::text from public.offers where id = (select id from ids where name = 'o')), 'live',
  'more units -> live again');

-- V3: sold out, deactivate, delete --------------------------------------------------------
select lives_ok($$ select public.set_offer_status((select id from ids where name = 'o'), 'sold_out') $$, 'mark sold out');
select lives_ok($$ select public.set_offer_status((select id from ids where name = 'o'), 'deactivated') $$, 'deactivate');
select tests.clear_authentication();
select tests.authenticate_as((select id from ids where name = 'customer'));
select is_empty($$ select 1 from public.offers where id = (select id from ids where name = 'o') $$,
  'V3: a deactivated offer disappears for customers at once');
select tests.clear_authentication();
select tests.authenticate_as((select id from ids where name = 'shop'));
select lives_ok($$ select public.set_offer_status((select id from ids where name = 'o'), 'live') $$, 'turn back on');
select throws_ok($$ select public.set_offer_status((select id from ids where name = 'o'), 'expired') $$,
  '22023', 'VALIDATION_FAILED', 'vendors cannot set expired');
select lives_ok($$ select public.set_offer_status((select id from ids where name = 'o'), 'deleted') $$,
  'delete with no open orders');
select throws_ok($$ select public.set_offer_status((select id from ids where name = 'o'), 'live') $$,
  '22023', 'VALIDATION_FAILED', 'a deleted offer stays deleted');

-- V4: clone a past offer for today ---------------------------------------------------------
select throws_ok(
  $$ select public.clone_offer((select id from ids where name = 'o'), now() + interval '1 hour', now() + interval '2 hours') $$,
  '22023', 'VALIDATION_FAILED', 'a deleted offer cannot be cloned'
);
select tests.clear_authentication();
update public.offers set status = 'expired' where id = (select id from ids where name = 'o');
select tests.authenticate_as((select id from ids where name = 'shop'));
select throws_ok(
  $$ select public.clone_offer((select id from ids where name = 'o'), now() + interval '2 days', now() + interval '2 days 2 hours') $$,
  '22023', 'VALIDATION_FAILED', 'V4: the copy must be for today'
);
select lives_ok(
  $$ insert into ids select 'copy', (public.clone_offer((select id from ids where name = 'o'),
       date_trunc('minute', now()) + interval '1 minute', date_trunc('minute', now()) + interval '2 minutes')).id $$,
  'V4: one tap copies the offer'
);
select is(
  (select status::text || ':' || quantity_reserved || ':' || price from public.offers where id = (select id from ids where name = 'copy')),
  'live:0:12000', 'the copy is live, with nothing reserved and the same price'
);
select is((select count(*)::int from public.offer_images where offer_id = (select id from ids where name = 'copy')), 1,
  'the copy reuses the photo');

-- T4.7 expire-offers -------------------------------------------------------------------------
select tests.clear_authentication();
update public.offers set expires_at = now() - interval '1 second', pickup_start = now() - interval '1 hour',
                         pickup_end = now() + interval '1 minute'
 where id = (select id from ids where name = 'copy');
select is((public.expire_offers() ->> 'expired')::int, 1, 'expire_offers flips the past offer');
select is((select status::text from public.offers where id = (select id from ids where name = 'copy')), 'expired',
  'the offer is expired');
select ok(exists (select 1 from cron.job where jobname = 'expire-offers' and schedule = '* * * * *'),
  'expire-offers runs every minute');

-- T4.8 vendor_dashboard matches a direct count ----------------------------------------------------
select tests.authenticate_as((select id from ids where name = 'shop'));
select lives_ok($$ insert into ids select 'o2', (public.create_offer(pg_temp.offer_json())).id $$, 'another offer');
select tests.clear_authentication();
update public.offers set status = 'live' where id = (select id from ids where name = 'o2');
select tests.authenticate_as((select id from ids where name = 'shop'));
select is(
  (public.vendor_dashboard() ->> 'active_offers')::int,
  (select count(*)::int from public.offers where vendor_id = (select id from ids where name = 'v')
     and offer_kind = 'surplus' and status = 'live'),
  'dashboard active offers = direct SQL count'
);
select tests.clear_authentication();

select * from finish();
rollback;
