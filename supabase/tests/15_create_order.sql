-- T6.6 create_order_hold (the database half of create-order) and
-- release-holds. Done-when: the last unit goes to exactly one buyer (the
-- truly parallel case is supabase/functions/create-order/race_test.ts); a
-- hold is released after 10 minutes. Plus S4 leftovers: an order keeps its
-- price after the offer is edited (V2), and an offer with open orders cannot
-- be deleted.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select on ids to authenticated;
insert into ids values
  ('v_owner', tests.create_user('co-v@example.test', 'vendor')),
  ('old_owner', tests.create_user('co-old@example.test', 'vendor')),
  ('a', tests.create_user('co-a@example.test', 'customer')),
  ('b', tests.create_user('co-b@example.test', 'customer')),
  ('susp', tests.create_user('co-s@example.test', 'customer'));
update public.profiles set status = 'suspended' where id = (select id from ids where name = 'susp');

-- New vendor (inside the 30 free days) and an older one (12%).
with x as (
  insert into public.vendors (owner_id, name, type, status, location, commission_rate_bp,
                              commission_free_until, approved_at)
  values ((select id from ids where name = 'v_owner'), 'Hold Momo', 'restaurant', 'approved',
          extensions.st_setsrid(extensions.st_makepoint(85.72, 27.81), 4326)::extensions.geography,
          1200, now() + interval '20 days', now() - interval '10 days')
  returning id)
insert into ids select 'v', id from x;
with x as (
  insert into public.vendors (owner_id, name, type, status, location, commission_rate_bp,
                              commission_free_until, approved_at)
  values ((select id from ids where name = 'old_owner'), 'Old Bakery', 'bakery', 'approved',
          extensions.st_setsrid(extensions.st_makepoint(85.73, 27.81), 4326)::extensions.geography,
          1200, now() - interval '5 days', now() - interval '35 days')
  returning id)
insert into ids select 'old', id from x;

create function pg_temp.offer(p_vendor text, p_qty int, p_expires interval default '3 hours')
returns uuid language sql as $$
  insert into public.offers (vendor_id, offer_kind, title, food_type, original_price, price,
    quantity_total, pickup_start, pickup_end, expires_at, status)
  values ((select id from ids where name = p_vendor), 'surplus', 'Box', 'veg', 40000, 25000, p_qty,
    now(), now() + interval '3 hours', now() + p_expires, 'live')
  returning id;
$$;
insert into ids values
  ('o5', pg_temp.offer('v', 5)),
  ('last', pg_temp.offer('v', 1)),
  ('old_o', pg_temp.offer('old', 5)),
  ('rate_o', pg_temp.offer('old', 50));

create function pg_temp.hold(p_who text, p_offer text, p_qty int)
returns public.orders language sql as $$
  select public.create_order_hold((select id from ids where name = p_who),
                                  (select id from ids where name = p_offer), p_qty);
$$;

-- Apps cannot call it; only create-order (service role) does.
select ok(not has_function_privilege('authenticated', 'public.create_order_hold(uuid, uuid, int)', 'execute'),
          'create_order_hold is service role only');

-- A good order: snapshot, hold, reservation, first event.
insert into ids select 'ord', (pg_temp.hold('a', 'o5', 2)).id;
select is((select status::text from public.orders where id = (select id from ids where name = 'ord')),
          'pending_payment', 'order starts as pending_payment');
select is((select unit_price from public.orders where id = (select id from ids where name = 'ord')), 25000::bigint,
          'unit price snapshot');
select is((select total from public.orders where id = (select id from ids where name = 'ord')), 50000::bigint,
          'total = price x quantity (from the database)');
select ok((select hold_expires_at between now() + interval '9 minutes 59 seconds' and now() + interval '10 minutes 1 second'
           from public.orders where id = (select id from ids where name = 'ord')), 'hold of 10 minutes');
select is((select quantity_reserved from public.offers where id = (select id from ids where name = 'o5')), 2,
          'units are reserved');
select is((select count(*)::int from public.order_events
           where order_id = (select id from ids where name = 'ord') and from_status is null
             and to_status = 'pending_payment'), 1, 'creation writes the first event');
select is((select commission_rate_bp from public.orders where id = (select id from ids where name = 'ord')), 0,
          'commission 0% inside the free 30 days');
select is((pg_temp.hold('a', 'old_o', 1)).commission_rate_bp, 1200, 'commission 12% after the free days');

-- Refusals.
select throws_ok(format('select public.create_order_hold(%L, %L, 6)', (select id from ids where name = 'b'),
                        (select id from ids where name = 'o5')),
  'VALIDATION_FAILED', 'more than max per order (5) is refused');
select throws_ok(format('select public.create_order_hold(%L, %L, 0)', (select id from ids where name = 'b'),
                        (select id from ids where name = 'o5')),
  'VALIDATION_FAILED', 'zero is refused');
select throws_ok(format('select public.create_order_hold(%L, %L, 4)', (select id from ids where name = 'b'),
                        (select id from ids where name = 'o5')),
  'QUANTITY_EXCEEDED', 'more than left is refused');
select throws_ok(format('select public.create_order_hold(%L, %L, 1)', (select id from ids where name = 'susp'),
                        (select id from ids where name = 'o5')),
  'ACCOUNT_SUSPENDED', 'suspended customer is refused');

-- The last unit: the first buyer gets it, the second is refused, and the
-- offer turns sold out.
insert into ids select 'last_ord', (pg_temp.hold('a', 'last', 1)).id;
select throws_ok(format('select public.create_order_hold(%L, %L, 1)', (select id from ids where name = 'b'),
                        (select id from ids where name = 'last')),
  'QUANTITY_EXCEEDED', 'second buyer of the last unit is refused');
select is((select status::text from public.offers where id = (select id from ids where name = 'last')), 'sold_out',
          'offer is sold out when every unit is held');

-- Rate limit: 5 orders a minute per customer.
select pg_temp.hold('b', 'rate_o', 1) from generate_series(1, 5);
select throws_ok(format('select public.create_order_hold(%L, %L, 1)', (select id from ids where name = 'b'),
                        (select id from ids where name = 'rate_o')),
  'RATE_LIMITED', 'the sixth order in a minute is refused');

-- Expired / suspended offers.
update public.offers set expires_at = now() - interval '1 second', pickup_start = now() - interval '2 hours'
 where id = (select id from ids where name = 'old_o');
select throws_ok(format('select public.create_order_hold(%L, %L, 1)', (select id from ids where name = 'a'),
                        (select id from ids where name = 'old_o')),
  'OFFER_UNAVAILABLE', 'expired offer is refused');

-- S4 leftover (V2): editing the price later never changes an existing order.
select tests.authenticate_as((select id from ids where name = 'v_owner'));
select public.update_offer((select id from ids where name = 'o5'),
  (select version from public.offers where id = (select id from ids where name = 'o5')),
  '{"price": 30000}'::jsonb);
select tests.clear_authentication();
select is((select unit_price from public.orders where id = (select id from ids where name = 'ord')), 25000::bigint,
          'order keeps its price after the offer price changes');

-- S4 leftover: delete is blocked while open orders exist.
select tests.authenticate_as((select id from ids where name = 'v_owner'));
select throws_ok(format('select public.set_offer_status(%L, ''deleted'')', (select id from ids where name = 'o5')),
  'OPEN_ORDERS_EXIST', 'offer with open orders cannot be deleted');
select tests.clear_authentication();

-- release-holds: a hold past its time is released and the units come back.
update public.orders set hold_expires_at = now() - interval '1 second'
 where id in ((select id from ids where name = 'ord'), (select id from ids where name = 'last_ord'));
select ok(public.release_holds() >= 2, 'release_holds releases expired holds');
select is((select status::text from public.orders where id = (select id from ids where name = 'ord')),
          'expired_hold', 'order becomes expired_hold');
select is((select count(*)::int from public.order_events
           where order_id = (select id from ids where name = 'ord') and to_status = 'expired_hold'), 1,
          'release writes an event');
select is((select quantity_reserved from public.offers where id = (select id from ids where name = 'o5')), 0,
          'units return to the offer');
select is((select status::text from public.offers where id = (select id from ids where name = 'last')), 'live',
          'a sold-out offer opens again');
select is(public.release_holds(), 0, 'a second run does nothing');
select is((select count(*)::int from cron.job where jobname = 'release-holds' and schedule = '* * * * *'), 1,
          'release-holds runs every minute');

select * from finish();
rollback;
