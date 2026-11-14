-- T4.1 done-when: every V1 rule rejected at the database; customer sees only
-- live offers of approved vendors. Plus location copy, search_tsv and the
-- 5-image limit.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select on ids to authenticated;
insert into ids values
  ('shop', tests.create_user('shop@example.test', 'vendor')),
  ('draftshop', tests.create_user('draft@example.test', 'vendor')),
  ('customer', tests.create_user('sita@example.test'));
with v as (
  insert into public.vendors (owner_id, name, status, location)
  values ((select id from ids where name = 'shop'), 'Momo Ghar', 'approved',
          extensions.st_geogfromtext('SRID=4326;POINT(85.31 27.71)'))
  returning id
) insert into ids select 'v', id from v;
with v as (
  insert into public.vendors (owner_id, name, status)
  values ((select id from ids where name = 'draftshop'), 'Not Yet', 'submitted')
  returning id
) insert into ids select 'v_draft', id from v;

create function pg_temp.surplus(p_changes jsonb default '{}')
returns text language sql as $$
  select format(
    $f$insert into public.offers (vendor_id, offer_kind, title, food_type, original_price, price,
         quantity_total, pickup_start, pickup_end, expires_at, status)
       select (select id from ids where name = %L), 'surplus', %L, %L::public.food_type,
              %s, %s, %s, now() + interval %L, now() + interval %L, now() + interval %L, %L::public.offer_status$f$,
    coalesce(p_changes ->> 'vendor', 'v'),
    coalesce(p_changes ->> 'title', 'Veg momo box'),
    coalesce(p_changes ->> 'food_type', 'veg'),
    coalesce(p_changes ->> 'original_price', '30000'),
    coalesce(p_changes ->> 'price', '15000'),
    coalesce(p_changes ->> 'quantity_total', '5'),
    coalesce(p_changes ->> 'start', '1 hour'),
    coalesce(p_changes ->> 'end', '3 hours'),
    coalesce(p_changes ->> 'expires', '2 hours'),
    coalesce(p_changes ->> 'status', 'live'));
$$;

-- Schema -------------------------------------------------------------------------
select has_table('public', 'offers', 'offers table');
select has_table('public', 'offer_images', 'offer_images table');
select has_table('public', 'deal_schedules', 'deal_schedules table');
select has_table('public', 'waitlist', 'waitlist table');

-- V1 rules at the database ------------------------------------------------------------
select lives_ok(pg_temp.surplus(), 'a valid surplus offer is accepted');
select throws_ok(pg_temp.surplus('{"price": "30000"}'), '23514', null, 'price equal to original refused');
select throws_ok(pg_temp.surplus('{"price": "40000"}'), '23514', null, 'price above original refused');
select throws_ok(pg_temp.surplus('{"price": "0"}'), '23514', null, 'zero price refused');
select throws_ok(pg_temp.surplus('{"end": "30 minutes"}'), '23514', null, 'pickup end before start refused');
select throws_ok(pg_temp.surplus('{"expires": "4 hours"}'), '23514', null, 'expiry after pickup end refused');
select throws_ok(pg_temp.surplus('{"quantity_total": "0"}'), '23514', null, 'zero quantity refused');
select throws_ok(pg_temp.surplus('{"title": " "}'), '23514', null, 'empty name refused');
select throws_ok(
  $$ insert into public.offers (vendor_id, offer_kind, title, original_price, price, quantity_total,
       pickup_start, pickup_end, expires_at)
     values ((select id from ids where name = 'v'), 'surplus', 'No type', 30000, 15000, 5,
       now() + interval '1 hour', now() + interval '3 hours', now() + interval '2 hours') $$,
  '23514', null, 'surplus without food type refused'
);
select throws_ok(
  $$ update public.offers set quantity_reserved = 6 where title = 'Veg momo box' $$,
  '23514', null, 'reserved above total refused'
);
select throws_ok(
  $$ insert into public.offers (vendor_id, offer_kind, title, deal_discount_pct, pickup_start)
     values ((select id from ids where name = 'v'), 'happy_hour', 'HH', 20, now()) $$,
  '23514', null, 'happy hour with a pickup time refused'
);
select lives_ok(
  $$ insert into public.offers (vendor_id, offer_kind, title, deal_discount_pct, status)
     values ((select id from ids where name = 'v'), 'happy_hour', '20% off drinks', 20, 'live') $$,
  'happy hour with a discount % accepted'
);

-- Location copy and search ----------------------------------------------------------
select is(
  (select extensions.st_astext(location::extensions.geometry) from public.offers where title = 'Veg momo box'),
  'POINT(85.31 27.71)', 'offer gets the vendor pin'
);
update public.vendors set location = extensions.st_geogfromtext('SRID=4326;POINT(85.32 27.72)')
 where id = (select id from ids where name = 'v');
select is(
  (select extensions.st_astext(location::extensions.geometry) from public.offers where title = 'Veg momo box'),
  'POINT(85.32 27.72)', 'moving the vendor pin moves the offer'
);
select ok(
  (select search_tsv @@ to_tsquery('simple', 'momo') from public.offers where title = 'Veg momo box'),
  'search_tsv finds the title'
);
select is((select discount_pct from public.offers where title = 'Veg momo box'), 50, 'discount % is generated');

-- 5-image limit ------------------------------------------------------------------------
insert into public.offer_images (offer_id, path, position)
select (select id from public.offers where title = 'Veg momo box'), 'p' || g, g from generate_series(0, 4) g;
select throws_ok(
  $$ insert into public.offer_images (offer_id, path, position)
     select id, 'p5', 4 from public.offers where title = 'Veg momo box' $$,
  '22023', 'VALIDATION_FAILED', 'a sixth image is refused'
);

-- Customer visibility -----------------------------------------------------------------
select lives_ok(pg_temp.surplus('{"title": "Draft box", "status": "draft"}'), 'setup');
select lives_ok(pg_temp.surplus('{"title": "Hidden box", "status": "deactivated"}'), 'setup');
select lives_ok(pg_temp.surplus('{"title": "Unapproved box", "vendor": "v_draft"}'), 'setup');

select tests.authenticate_as((select id from ids where name = 'customer'));
select results_eq(
  $$ select title from public.offers order by title $$,
  $$ values ('20% off drinks'), ('Veg momo box') $$,
  'customer sees only live offers of approved vendors'
);
update public.offers set price = 1 where title = 'Veg momo box';
select is(
  (select price from public.offers where title = 'Veg momo box'), 15000::bigint,
  'customers cannot write offers (update changes nothing)'
);
select tests.clear_authentication();

select tests.authenticate_as((select id from ids where name = 'shop'));
select is((select count(*)::int from public.offers), 4, 'vendor sees all of their own offers');
select tests.clear_authentication();

select * from finish();
rollback;
