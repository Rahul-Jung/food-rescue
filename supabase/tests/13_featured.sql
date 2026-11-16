-- T6.4 done-when: a featured vendor outside the radius is not shown; an ended
-- slot drops out (featured-expiry runs hourly). Plus admin_set_featured checks
-- and audit, and featured_slots RLS (vendor reads own, customer none).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select on ids to authenticated;
insert into ids values
  ('admin', tests.create_user('feat-admin@example.test', 'admin')),
  ('fv_owner', tests.create_user('fv@example.test', 'vendor')),
  ('pv_owner', tests.create_user('pv@example.test', 'vendor')),
  ('far_owner', tests.create_user('far@example.test', 'vendor')),
  ('sub_owner', tests.create_user('sub@example.test', 'vendor')),
  ('cust', tests.create_user('feat-cust@example.test', 'customer'));

create temp table c as
  select extensions.st_setsrid(extensions.st_makepoint(85.60, 27.70), 4326)::extensions.geography as p;

create function pg_temp.vendor(p_owner text, p_name text, p_m int, p_status text default 'approved')
returns uuid language sql as $$
  insert into public.vendors (owner_id, name, type, status, location)
  values ((select id from ids where name = p_owner), p_name, 'restaurant', p_status::public.vendor_status,
          extensions.st_project((select p from c), p_m, 0))
  returning id;
$$;
insert into ids values
  ('fv', pg_temp.vendor('fv_owner', 'Featured Kitchen', 1500)),
  ('pv', pg_temp.vendor('pv_owner', 'Plain Kitchen', 200)),
  ('far', pg_temp.vendor('far_owner', 'Far Featured', 5000)),
  ('sub', pg_temp.vendor('sub_owner', 'Not Approved', 300, 'submitted'));

create function pg_temp.offer(p_vendor text)
returns uuid language sql as $$
  insert into public.offers (vendor_id, offer_kind, title, food_type, original_price, price,
    quantity_total, pickup_start, pickup_end, expires_at, status)
  values ((select id from ids where name = p_vendor), 'surplus', 'Box', 'veg', 40000, 20000, 5,
    now(), now() + interval '3 hours', now() + interval '3 hours', 'live')
  returning id;
$$;
insert into ids values ('fv_o', pg_temp.offer('fv')), ('pv_o', pg_temp.offer('pv')),
  ('far_o', pg_temp.offer('far'));

create function pg_temp.near()
returns table (id uuid, is_featured boolean) language sql as $$
  select n.id, n.is_featured from public.nearby_offers(27.70, 85.60, 2000) n;
$$;

-- Only an admin with TOTP.
select tests.authenticate_as((select id from ids where name = 'fv_owner'));
select throws_ok(
  format('select public.admin_set_featured(%L, now(), now() + interval ''1 day'', 100000)',
         (select id from ids where name = 'fv')),
  'FORBIDDEN', 'vendors cannot set featured slots');
select tests.clear_authentication();

select tests.authenticate_as_admin((select id from ids where name = 'admin'));
select throws_ok(
  format('select public.admin_set_featured(%L, now(), now() - interval ''1 hour'', 100000)',
         (select id from ids where name = 'fv')),
  'VALIDATION_FAILED', 'end must be after start');
select throws_ok(
  format('select public.admin_set_featured(%L, now(), now() + interval ''1 day'', 100000)',
         (select id from ids where name = 'sub')),
  'VALIDATION_FAILED', 'only approved vendors can be featured');
insert into ids
select 'slot', (public.admin_set_featured((select id from ids where name = 'fv'),
                now() - interval '1 hour', now() + interval '1 day', 150000, 'Paid in cash')).id;
insert into ids
select 'far_slot', (public.admin_set_featured((select id from ids where name = 'far'),
                now() - interval '1 hour', now() + interval '1 day', 150000)).id;
select tests.clear_authentication();

select is((select count(*)::int from public.audit_log
           where action = 'admin_set_featured' and entity_id = (select id from ids where name = 'slot')::text),
          1, 'adding a slot writes audit_log');

select tests.authenticate_as((select id from ids where name = 'cust'));
select is((select n.id from pg_temp.near() n limit 1), (select id from ids where name = 'fv_o'),
          'featured vendor comes first');
select ok((select n.is_featured from pg_temp.near() n where n.id = (select id from ids where name = 'fv_o')),
          'its offer is marked featured');
select ok(not exists (select 1 from pg_temp.near() n where n.id = (select id from ids where name = 'far_o')),
          'featured vendor outside the radius is not shown');
select is((select count(*)::int from public.featured_slots), 0, 'customers cannot read featured_slots');
select tests.clear_authentication();

select tests.authenticate_as((select id from ids where name = 'fv_owner'));
select is((select count(*)::int from public.featured_slots), 1, 'vendor reads own slots only');
select tests.clear_authentication();

-- End the slot early: it drops out at once.
select tests.authenticate_as_admin((select id from ids where name = 'admin'));
select ok((public.admin_set_featured((select id from ids where name = 'fv'), now() - interval '1 hour',
           now(), 150000, 'Ended early', (select id from ids where name = 'slot'))).ended,
          'ending a slot early marks it ended');
select tests.clear_authentication();
select tests.authenticate_as((select id from ids where name = 'cust'));
select ok(not (select n.is_featured from pg_temp.near() n where n.id = (select id from ids where name = 'fv_o')),
          'ended slot is no longer featured');
select tests.clear_authentication();

-- featured-expiry marks slots whose end has passed.
insert into public.featured_slots (vendor_id, starts_at, ends_at, amount_paid)
values ((select id from ids where name = 'pv'), now() - interval '2 days', now() - interval '1 minute', 0);
select ok(public.expire_featured() >= 1, 'expire_featured ends past slots');
select ok((select bool_and(ended) from public.featured_slots where ends_at <= now()), 'no past slot left active');
select is((select count(*)::int from cron.job where jobname = 'featured-expiry' and schedule = '0 * * * *'),
          1, 'featured-expiry runs every hour');

select * from finish();
rollback;
