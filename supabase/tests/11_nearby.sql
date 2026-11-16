-- T5.2 done-when: radius edge (1999 m in, 2001 m out), each filter, deal
-- hours; EXPLAIN shows the GIST index; under 200 ms on seed. Plus T5.3
-- join_waitlist. Test vendors sit at 27.60, 85.50, far from the seed data.
begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select, insert on ids to authenticated;
insert into ids values
  ('near_owner', tests.create_user('near@example.test', 'vendor')),
  ('edge_owner', tests.create_user('edge@example.test', 'vendor')),
  ('out_owner', tests.create_user('out@example.test', 'vendor')),
  ('bake_owner', tests.create_user('bake@example.test', 'vendor')),
  ('cust', tests.create_user('cust@example.test', 'customer')),
  ('susp', tests.create_user('susp@example.test', 'customer'));
update public.profiles set status = 'suspended' where id = (select id from ids where name = 'susp');

create temp table c as
  select extensions.st_setsrid(extensions.st_makepoint(85.50, 27.60), 4326)::extensions.geography as p;

with x as (
  insert into public.vendors (owner_id, name, type, status, location)
  values ((select id from ids where name = 'near_owner'), 'Near Momo Pasal', 'restaurant', 'approved',
          extensions.st_project((select p from c), 500, 0))
  returning id)
insert into ids select 'near', id from x;
with x as (
  insert into public.vendors (owner_id, name, type, status, location)
  values ((select id from ids where name = 'edge_owner'), 'Edge Cafe', 'cafe', 'approved',
          extensions.st_project((select p from c), 1999, radians(90)))
  returning id)
insert into ids select 'edge', id from x;
with x as (
  insert into public.vendors (owner_id, name, type, status, location)
  values ((select id from ids where name = 'out_owner'), 'Outside Cafe', 'cafe', 'approved',
          extensions.st_project((select p from c), 2001, radians(180)))
  returning id)
insert into ids select 'out', id from x;
with x as (
  insert into public.vendors (owner_id, name, type, status, location)
  values ((select id from ids where name = 'bake_owner'), 'Bake House', 'bakery', 'approved',
          extensions.st_project((select p from c), 1000, radians(270)))
  returning id)
insert into ids select 'bake', id from x;

-- Surplus offers --------------------------------------------------------------------
create function pg_temp.mk(p_vendor text, p_title text, p_title_ne text, p_food text, p_price bigint,
  p_qty int default 5, p_pickup_end interval default '3 hours', p_status text default 'live')
returns uuid language sql as $$
  insert into public.offers (vendor_id, offer_kind, title, title_ne, food_type, original_price, price,
    quantity_total, pickup_start, pickup_end, expires_at, status)
  values ((select id from ids where name = p_vendor), 'surplus', p_title, p_title_ne,
    p_food::public.food_type, p_price * 2, p_price, p_qty, now() - interval '1 hour',
    now() + p_pickup_end, now() + p_pickup_end, p_status::public.offer_status)
  returning id;
$$;
insert into ids values
  ('veg_momo', pg_temp.mk('near', 'Veg momo box', 'भेज मम बक्स', 'veg', 15000)),
  ('chicken', pg_temp.mk('near', 'Chicken chowmein', null, 'non_veg', 30000, 5, '1 hour')),
  ('edge_cake', pg_temp.mk('edge', 'Cake slices', null, 'veg', 20000, 5, '6 hours')),
  ('out_cake', pg_temp.mk('out', 'Far cake', null, 'veg', 10000)),
  ('bread', pg_temp.mk('bake', 'Bread bag', null, 'vegan', 8000)),
  ('sold', pg_temp.mk('near', 'Sold out samosa', null, 'veg', 5000, 1)),
  ('draft', pg_temp.mk('near', 'Draft offer', null, 'veg', 5000, 1, '3 hours', 'draft'));
update public.offers set quantity_reserved = 1 where id = (select id from ids where name = 'sold');
-- an expired-by-time surplus offer that the cron has not flipped yet
insert into ids values ('stale', pg_temp.mk('near', 'Stale bread', null, 'veg', 5000));
update public.offers set pickup_start = now() - interval '3 hours', pickup_end = now() - interval '1 minute',
  expires_at = now() - interval '1 minute' where id = (select id from ids where name = 'stale');

-- Happy hour deals: one live now, one later today, one paused -------------------------
create function pg_temp.mkdeal(p_title text, p_status text, p_from interval, p_to interval)
returns uuid language plpgsql as $$
declare
  o uuid;
  l time := (now() at time zone 'Asia/Kathmandu')::time;
begin
  insert into public.offers (vendor_id, offer_kind, title, deal_discount_pct, status)
  values ((select id from ids where name = 'near'), 'happy_hour', p_title, 25, p_status::public.offer_status)
  returning id into o;
  insert into public.deal_schedules (offer_id, day_of_week, start_time, end_time)
  select o, d, l + p_from, l + p_to from generate_series(0, 6) d;
  return o;
end $$;
insert into ids values
  ('deal_live', pg_temp.mkdeal('Live happy hour', 'live', '-1 hour', '1 hour')),
  ('deal_later', pg_temp.mkdeal('Later happy hour', 'live', '2 hours', '3 hours')),
  ('deal_paused', pg_temp.mkdeal('Paused happy hour', 'deactivated', '-1 hour', '1 hour'));

create function pg_temp.found(p_name text, p_rows uuid[]) returns boolean language sql as $$
  select (select id from ids where name = p_name) = any (p_rows);
$$;
grant execute on function pg_temp.found(text, uuid[]) to authenticated;

-- Auth --------------------------------------------------------------------------------
select tests.authenticate_as((select id from ids where name = 'susp'));
select throws_ok($$ select * from public.nearby_offers(27.60, 85.50) $$,
  '42501', 'ACCOUNT_SUSPENDED', 'suspended users cannot search');
select tests.clear_authentication();

select tests.authenticate_as((select id from ids where name = 'cust'));
create temp table r on commit drop as
  select array_agg(id) as ids, array_agg(id order by distance_m) as by_dist from public.nearby_offers(27.60, 85.50, 2000);

-- Radius edge -------------------------------------------------------------------------
select ok(pg_temp.found('edge_cake', (select ids from r)), '1999 m away is inside 2 km');
select ok(not pg_temp.found('out_cake', (select ids from r)), '2001 m away is outside 2 km');
select ok(pg_temp.found('out_cake', array(select id from public.nearby_offers(27.60, 85.50, 3000))),
  '2001 m is inside 3 km');
select throws_ok($$ select * from public.nearby_offers(27.60, 85.50, 2500) $$,
  '22023', 'VALIDATION_FAILED', 'radius must be one of the radius options');

-- What is listed ----------------------------------------------------------------------
select ok(pg_temp.found('veg_momo', (select ids from r)), 'live surplus offer listed');
select ok(not pg_temp.found('sold', (select ids from r)), 'nothing left = not listed');
select ok(not pg_temp.found('draft', (select ids from r)), 'draft not listed');
select ok(not pg_temp.found('stale', (select ids from r)), 'expired by time not listed');
select ok((select bool_and(d >= prev) from (
  select distance_m d, lag(distance_m, 1, 0) over (order by n) prev
  from public.nearby_offers(27.60, 85.50) with ordinality x(id, offer_kind, title, title_ne, food_type,
    original_price, price, discount_pct, quantity_left, pickup_start, pickup_end, expires_at, vendor_id,
    vendor_name, vendor_type, lat, lng, distance_m, is_featured, deal_live, next_start, n)) z),
  'nearest first by default');
select is((select distance_m from public.nearby_offers(27.60, 85.50) where id = (select id from ids where name = 'veg_momo')),
  500, 'distance in metres');
select is((select quantity_left from public.nearby_offers(27.60, 85.50) where id = (select id from ids where name = 'veg_momo')),
  5, 'quantity left');

-- Deal hours (BR14) -----------------------------------------------------------------------
select ok(pg_temp.found('deal_live', (select ids from r)), 'deal inside its hours is listed');
select ok(not pg_temp.found('deal_later', (select ids from r)), 'deal outside its hours is hidden');
select ok(not pg_temp.found('deal_paused', (select ids from r)), 'paused deal is hidden');
select ok((select deal_live and next_start > now() from public.nearby_offers(27.60, 85.50)
           where id = (select id from ids where name = 'deal_live')), 'deal row says live, with its next start');

-- Filters -----------------------------------------------------------------------------
select ok(array(select offer_kind::text from public.nearby_offers(27.60, 85.50, p_kind => 'happy_hour')) <@ array['happy_hour']
  and pg_temp.found('deal_live', array(select id from public.nearby_offers(27.60, 85.50, p_kind => 'happy_hour'))),
  'kind filter');
select ok(array(select food_type::text from public.nearby_offers(27.60, 85.50, p_food_type => 'vegan')) = array['vegan'],
  'food type filter');
select ok(array(select vendor_name from public.nearby_offers(27.60, 85.50, p_vendor_type => 'bakery')) = array['Bake House'],
  'vendor type filter (Bakery chip)');
select ok(not exists (select 1 from public.nearby_offers(27.60, 85.50, p_price_max => 20000) where price > 20000 or price is null)
  and pg_temp.found('edge_cake', array(select id from public.nearby_offers(27.60, 85.50, p_price_max => 20000))),
  'price max filter (Under Rs. 200 = 20000 paisa)');
select ok(not exists (select 1 from public.nearby_offers(27.60, 85.50, p_price_min => 20000) where price < 20000),
  'price min filter');
select throws_ok($$ select * from public.nearby_offers(27.60, 85.50, p_price_min => 30000, p_price_max => 10000) $$,
  '22023', 'VALIDATION_FAILED', 'min above max is refused');
select ok(not pg_temp.found('chicken', array(select id from public.nearby_offers(27.60, 85.50, p_pickup_after => now() + interval '2 hours')))
  and pg_temp.found('edge_cake', array(select id from public.nearby_offers(27.60, 85.50, p_pickup_after => now() + interval '2 hours'))),
  'pickup after filter');
select ok(pg_temp.found('veg_momo', array(select id from public.nearby_offers(27.60, 85.50, p_q => 'momo'))), 'text search in English');
select ok(pg_temp.found('veg_momo', array(select id from public.nearby_offers(27.60, 85.50, p_q => 'मम'))), 'text search in Nepali');
select ok(pg_temp.found('veg_momo', array(select id from public.nearby_offers(27.60, 85.50, p_q => 'mom'))), 'prefix search');
select is((select count(*)::int from public.nearby_offers(27.60, 85.50, p_q => 'zzzz')), 0, 'no match, no rows');
select is((select price from public.nearby_offers(27.60, 85.50, p_sort => 'price') limit 1), 8000::bigint, 'sort by price');

-- Paging: 20 per page -----------------------------------------------------------------
select tests.clear_authentication();
insert into public.offers (vendor_id, offer_kind, title, food_type, original_price, price, quantity_total,
  pickup_start, pickup_end, expires_at, status)
select (select id from ids where name = 'bake'), 'surplus', 'Bun ' || g, 'veg', 2000, 1000, 3,
  now(), now() + interval '2 hours', now() + interval '2 hours', 'live'
from generate_series(1, 25) g;
select tests.authenticate_as((select id from ids where name = 'cust'));
select is((select count(*)::int from public.nearby_offers(27.60, 85.50)), 20, '20 per page');
select ok((select count(*) from public.nearby_offers(27.60, 85.50, p_page => 1)) > 0, 'second page');

-- Waitlist (T5.3) ---------------------------------------------------------------------
select lives_ok($$ select public.join_waitlist('9841000000', 'Bhaktapur', 27.67, 85.43) $$, 'waitlist entry saved');
select throws_ok($$ select public.join_waitlist('hello', null) $$, '22023', 'VALIDATION_FAILED', 'contact must be a phone or email');
select is((select count(*)::int from public.waitlist), 0, 'customers cannot read the waitlist');
select tests.clear_authentication();

-- deal_next_start: a Friday 17:00 deal seen at 18:00 Friday starts next Friday 17:00
select is(public.deal_next_start((select id from ids where name = 'deal_paused'), now()) is not null, true,
  'next start exists for a deal with windows');
select is(
  (select min(t) from (select public.deal_next_start(o.id, '2026-11-13 18:00+05:45') as t
     from (select (select id from ids where name = 'deal_live') as id) o) z) > '2026-11-13 18:00+05:45',
  true, 'next start is after the given time');

-- GIST index used by the radius search, and speed ------------------------------------
create function pg_temp.plan_text(q text) returns text language plpgsql as $$
declare
  line text;
  out text := '';
begin
  for line in execute 'explain ' || q loop out := out || line || ' '; end loop;
  return out;
end $$;
set local enable_seqscan = off;
select ok(
  pg_temp.plan_text($q$ select id from public.offers
    where extensions.st_dwithin(location, extensions.st_setsrid(extensions.st_makepoint(85.31, 27.67), 4326)::extensions.geography, 2000) $q$)
    like '%offers_location_gist%',
  'radius search uses the GIST index');
reset enable_seqscan;

select tests.authenticate_as((select id from ids where name = 'cust'));
create temp table t0 (t timestamptz) on commit drop;
grant all on t0 to authenticated;
insert into t0 values (clock_timestamp());
select count(*) from public.nearby_offers(27.6730, 85.3140, 3000);
select ok(clock_timestamp() - (select t from t0) < interval '200 milliseconds', 'search on the seed under 200 ms');
select tests.clear_authentication();

select * from finish();
rollback;
