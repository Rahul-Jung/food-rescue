-- T6.1 offer_detail, T6.2 vendor_page, T6.3 deal_live_until. Done-when for
-- T6.1 (expired offer from cache shows a disabled Reserve) is checked on the
-- phone; here: the server reports sold-out / expired states, hides deleted,
-- draft and suspended-vendor offers, never shows PAN; deal windows across midnight.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select on ids to authenticated;
insert into ids values
  ('dv_owner', tests.create_user('dv@example.test', 'vendor')),
  ('sv_owner', tests.create_user('sv@example.test', 'vendor')),
  ('cust', tests.create_user('detail-cust@example.test', 'customer'));

with x as (
  insert into public.vendors (owner_id, name, type, status, pan_vat_no, phone, location)
  values ((select id from ids where name = 'dv_owner'), 'Detail Momo', 'restaurant', 'approved',
          '600000001', '+9779800099001',
          extensions.st_setsrid(extensions.st_makepoint(85.50, 27.60), 4326)::extensions.geography)
  returning id)
insert into ids select 'dv', id from x;
with x as (
  insert into public.vendors (owner_id, name, type, status, location)
  values ((select id from ids where name = 'sv_owner'), 'Suspended Cafe', 'cafe', 'suspended',
          extensions.st_setsrid(extensions.st_makepoint(85.51, 27.60), 4326)::extensions.geography)
  returning id)
insert into ids select 'sv', id from x;
insert into public.vendor_hours (vendor_id, day_of_week, opens, closes)
values ((select id from ids where name = 'dv'), 1, '10:00', '21:00');

create function pg_temp.mk(p_vendor text, p_title text, p_qty int default 5, p_status text default 'live')
returns uuid language sql as $$
  insert into public.offers (vendor_id, offer_kind, title, food_type, original_price, price,
    quantity_total, pickup_start, pickup_end, expires_at, status)
  values ((select id from ids where name = p_vendor), 'surplus', p_title, 'veg', 40000, 20000, p_qty,
    now() - interval '1 hour', now() + interval '3 hours', now() + interval '3 hours',
    p_status::public.offer_status)
  returning id;
$$;
insert into ids values
  ('live', pg_temp.mk('dv', 'Live momo')),
  ('sold', pg_temp.mk('dv', 'Sold samosa', 1)),
  ('stale', pg_temp.mk('dv', 'Stale bread')),
  ('gone', pg_temp.mk('dv', 'Deleted offer', 5, 'deleted')),
  ('draft', pg_temp.mk('dv', 'Draft offer', 5, 'draft')),
  ('sv_offer', pg_temp.mk('sv', 'Suspended offer'));
update public.offers set quantity_reserved = 1 where id = (select id from ids where name = 'sold');
update public.offers set pickup_start = now() - interval '3 hours', pickup_end = now() - interval '1 minute',
  expires_at = now() - interval '1 minute' where id = (select id from ids where name = 'stale');
insert into public.offer_images (offer_id, path, position)
select (select id from ids where name = 'live'), format('offers/x/y/%s.webp', n), n from generate_series(0, 1) n;

-- Deals: Friday 9 PM - 1 AM, and one live now every day.
with x as (
  insert into public.offers (vendor_id, offer_kind, title, deal_discount_pct, status)
  values ((select id from ids where name = 'dv'), 'happy_hour', 'Late night', 20, 'live') returning id)
insert into ids select 'deal', id from x;
insert into public.deal_schedules (offer_id, day_of_week, start_time, end_time)
values ((select id from ids where name = 'deal'), 5, '21:00', '01:00');
with x as (
  insert into public.offers (vendor_id, offer_kind, title, deal_discount_pct, status)
  values ((select id from ids where name = 'dv'), 'happy_hour', 'All day deal', 10, 'live') returning id)
insert into ids select 'deal_now', id from x;
insert into public.deal_schedules (offer_id, day_of_week, start_time, end_time)
select (select id from ids where name = 'deal_now'), d,
       ((now() at time zone 'Asia/Kathmandu') - interval '1 hour')::time,
       ((now() at time zone 'Asia/Kathmandu') + interval '1 hour')::time
from generate_series(0, 6) d;

-- Unauthenticated callers are refused.
select throws_ok(
  format('select public.offer_detail(%L)', (select id from ids where name = 'live')),
  'NOT_AUTHENTICATED', 'offer_detail needs a session');

-- deal_live_until across midnight (2026-11-20 is a Friday).
select is(public.deal_live_until((select id from ids where name = 'deal'), '2026-11-21 00:30+05:45'),
          '2026-11-21 01:00+05:45'::timestamptz, 'Friday window is live until 1:00 AM at 12:30 AM Saturday');
select is(public.deal_live_until((select id from ids where name = 'deal'), '2026-11-21 01:01+05:45'),
          null, 'not live at 1:01 AM');
select is(public.deal_live_until((select id from ids where name = 'deal'), '2026-11-20 22:00+05:45'),
          '2026-11-21 01:00+05:45'::timestamptz, 'Friday 10 PM: live until 1:00 AM');

select tests.authenticate_as((select id from ids where name = 'cust'));

select is(public.offer_detail((select id from ids where name = 'live')) ->> 'status', 'live', 'live offer');
select is(public.offer_detail((select id from ids where name = 'live')) ->> 'quantity_left', '5', 'quantity left');
select is(jsonb_array_length(public.offer_detail((select id from ids where name = 'live')) -> 'images'), 2,
          'images in order');
select is(public.offer_detail((select id from ids where name = 'live')) #>> '{vendor,name}', 'Detail Momo',
          'vendor card');
select ok(not (public.offer_detail((select id from ids where name = 'live')) -> 'vendor' ? 'pan_vat_no'),
          'vendor card has no PAN');
select is(public.offer_detail((select id from ids where name = 'sold')) ->> 'status', 'sold_out',
          'all units reserved shows sold out');
select is(public.offer_detail((select id from ids where name = 'stale')) ->> 'status', 'expired',
          'past expiry shows expired before the cron runs');
select throws_ok(format('select public.offer_detail(%L)', (select id from ids where name = 'gone')),
  'OFFER_UNAVAILABLE', 'deleted offer is hidden');
select throws_ok(format('select public.offer_detail(%L)', (select id from ids where name = 'draft')),
  'OFFER_UNAVAILABLE', 'draft offer is hidden');
select throws_ok(format('select public.offer_detail(%L)', (select id from ids where name = 'sv_offer')),
  'OFFER_UNAVAILABLE', 'offer of a suspended vendor is hidden');
select is(public.offer_detail((select id from ids where name = 'deal_now')) ->> 'deal_live', 'true',
          'deal live now');
select ok(public.offer_detail((select id from ids where name = 'deal_now')) ->> 'live_until' is not null,
          'deal shows live until');

select is(jsonb_array_length(public.vendor_page((select id from ids where name = 'dv')) -> 'offers'), 2,
          'vendor page: live and sold-out offers, not expired ones');
select is(jsonb_array_length(public.vendor_page((select id from ids where name = 'dv')) -> 'deals'), 2,
          'vendor page: live and upcoming deals');
select is(public.vendor_page((select id from ids where name = 'dv')) -> 'reviews', '[]'::jsonb,
          'vendor page: reviews empty until S7');
select is(jsonb_array_length(public.vendor_page((select id from ids where name = 'dv')) -> 'hours'), 1,
          'vendor page: hours');
select ok(not (public.vendor_page((select id from ids where name = 'dv')) ? 'pan_vat_no'),
          'vendor page has no PAN');
select throws_ok(format('select public.vendor_page(%L)', (select id from ids where name = 'sv')),
  'OFFER_UNAVAILABLE', 'suspended vendor page is hidden');

select tests.clear_authentication();
select * from finish();
rollback;
