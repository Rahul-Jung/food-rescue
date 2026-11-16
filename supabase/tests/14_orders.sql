-- T6.5 done-when: every invalid move of plan section 4 is rejected; every
-- valid one writes an event. Plus: status changes only through
-- transition_order, order_events is insert-only, pickup codes, RLS and the
-- vendor_orders view (first name + last initial, no phone or email).
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select on ids to authenticated;
insert into ids values
  ('v_owner', tests.create_user('orders-v@example.test', 'vendor')),
  ('w_owner', tests.create_user('orders-w@example.test', 'vendor')),
  ('cust', tests.create_user('orders-c@example.test', 'customer')),
  ('other', tests.create_user('orders-o@example.test', 'customer'));
update public.profiles set full_name = 'Sita Kumari Sharma', phone = '+9779800099111'
 where id = (select id from ids where name = 'cust');

with x as (
  insert into public.vendors (owner_id, name, type, status, location)
  values ((select id from ids where name = 'v_owner'), 'Orders Momo', 'restaurant', 'approved',
          extensions.st_setsrid(extensions.st_makepoint(85.70, 27.80), 4326)::extensions.geography)
  returning id)
insert into ids select 'v', id from x;
with x as (
  insert into public.vendors (owner_id, name, type, status, location)
  values ((select id from ids where name = 'w_owner'), 'Other Bakery', 'bakery', 'approved',
          extensions.st_setsrid(extensions.st_makepoint(85.71, 27.80), 4326)::extensions.geography)
  returning id)
insert into ids select 'w', id from x;
with x as (
  insert into public.offers (vendor_id, offer_kind, title, food_type, original_price, price,
    quantity_total, pickup_start, pickup_end, expires_at, status)
  values ((select id from ids where name = 'v'), 'surplus', 'Momo box', 'veg', 40000, 20000, 100,
    now(), now() + interval '3 hours', now() + interval '3 hours', 'live')
  returning id)
insert into ids select 'offer', id from x;

-- An order sitting in any status (inserted directly: only the service role
-- and create-order insert orders).
create function pg_temp.order_in(p_status public.order_status, p_customer text default 'cust')
returns uuid language sql as $$
  insert into public.orders (customer_id, vendor_id, offer_id, quantity, unit_price, total,
                             commission_rate_bp, status, hold_expires_at)
  values ((select id from ids where name = p_customer), (select id from ids where name = 'v'),
          (select id from ids where name = 'offer'), 1, 20000, 20000, 1200, p_status,
          now() + interval '10 minutes')
  returning id;
$$;

-- Try every (from, to) pair: count valid moves that worked and wrote one
-- event, and invalid moves that were refused.
create function pg_temp.matrix()
returns table (valid_ok int, valid_total int, invalid_refused int, invalid_total int)
language plpgsql as $$
declare
  f public.order_status;
  t public.order_status;
  o uuid;
  before_n int;
  after_n int;
begin
  valid_ok := 0; valid_total := 0; invalid_refused := 0; invalid_total := 0;
  foreach f in array enum_range(null::public.order_status) loop
    foreach t in array enum_range(null::public.order_status) loop
      o := pg_temp.order_in(f);
      select count(*) into before_n from public.order_events where order_id = o;
      if public.order_move_allowed(f, t) then
        valid_total := valid_total + 1;
        perform public.transition_order(o, t, null, 'test');
        select count(*) into after_n from public.order_events
         where order_id = o and from_status = f and to_status = t;
        if after_n = 1 and (select status from public.orders where id = o) = t then
          valid_ok := valid_ok + 1;
        end if;
      else
        invalid_total := invalid_total + 1;
        begin
          perform public.transition_order(o, t, null, 'test');
        exception when others then
          if sqlerrm = 'VALIDATION_FAILED'
             and (select status from public.orders where id = o) = f
             and (select count(*) from public.order_events where order_id = o) = before_n then
            invalid_refused := invalid_refused + 1;
          end if;
        end;
      end if;
    end loop;
  end loop;
  return next;
end $$;

create temp table m as select * from pg_temp.matrix();
select is((select valid_total from m), 10, 'section 4 lists 10 allowed moves');
select is((select valid_ok from m), 10, 'every valid move changes the status and writes one event');
select is((select invalid_total from m), 54, '54 other moves');
select is((select invalid_refused from m), 54, 'every invalid move is refused, nothing written');

-- Same table as packages/shared ORDER_TRANSITIONS.
select ok(public.order_move_allowed('pending_payment', 'paid')
          and public.order_move_allowed('paid', 'cancelled_by_vendor')
          and not public.order_move_allowed('expired_hold', 'paid')
          and not public.order_move_allowed('refunded', 'paid'), 'spot checks of the move table');

-- Paid issues a 6-digit pickup code and stamps paid_at.
insert into ids values ('pending', pg_temp.order_in('pending_payment'));
select public.transition_order((select id from ids where name = 'pending'), 'paid', null, null);
select matches((select code from public.orders where id = (select id from ids where name = 'pending')),
               '^[0-9]{6}$', 'paid order gets a 6-digit code');
select ok((select paid_at is not null from public.orders where id = (select id from ids where name = 'pending')),
          'paid_at stamped');
select matches(public.generate_pickup_code((select id from ids where name = 'v'))::text, '^[0-9]{6}$',
               'generate_pickup_code gives 6 digits');

-- Cancel stamps who, when and why.
insert into ids values ('paid', pg_temp.order_in('paid'));
select public.transition_order((select id from ids where name = 'paid'), 'cancelled_by_vendor',
                               (select id from ids where name = 'v_owner'), 'Ran out');
select is((select cancel_reason from public.orders where id = (select id from ids where name = 'paid')), 'Ran out',
          'cancel reason kept');

-- Status changes only through transition_order.
select throws_ok(
  format('update public.orders set status = ''collected'' where id = %L', (select id from ids where name = 'pending')),
  '42501', null, 'a direct status update is refused');
select throws_ok(
  format('update public.order_events set reason = ''x'' where order_id = %L', (select id from ids where name = 'pending')),
  '42501', null, 'order_events cannot be updated');
select throws_ok(
  format('delete from public.order_events where order_id = %L', (select id from ids where name = 'pending')),
  '42501', null, 'order_events cannot be deleted');
select throws_ok(
  format('update public.orders set code_attempts = 0, status = ''paid'' where id = %L',
         (select id from ids where name = 'paid')),
  '42501', null, 'even mixed into another update');

-- The apps cannot call the internal functions.
select ok(not has_function_privilege('authenticated',
  'public.transition_order(uuid, public.order_status, uuid, text)', 'execute'),
  'transition_order is not exposed to the apps');
select ok(not has_function_privilege('authenticated', 'public.generate_pickup_code(uuid)', 'execute'),
  'generate_pickup_code is not exposed');
select ok(not has_table_privilege('authenticated', 'public.orders', 'insert')
          and not has_table_privilege('authenticated', 'public.orders', 'update'),
  'apps cannot write orders');

-- RLS: customer reads own orders and their events only.
insert into ids values ('other_order', pg_temp.order_in('paid', 'other'));
select tests.authenticate_as((select id from ids where name = 'cust'));
select ok((select count(*) from public.orders) > 0
          and not exists (select 1 from public.orders where customer_id <> (select id from ids where name = 'cust')),
          'customer reads own orders only');
select ok(exists (select 1 from public.order_events where order_id = (select id from ids where name = 'pending'))
          and not exists (select 1 from public.order_events
                          where order_id = (select id from ids where name = 'other_order')),
          'customer reads own orders'' events only');
select is((select count(*)::int from public.vendor_orders), 0, 'customers see nothing in vendor_orders');
select tests.clear_authentication();

-- Vendor: no direct read of orders; vendor_orders with a short name only.
select tests.authenticate_as((select id from ids where name = 'v_owner'));
select is((select count(*)::int from public.orders), 0, 'vendor does not read orders directly');
select is((select customer_name from public.vendor_orders where id = (select id from ids where name = 'pending')),
          'Sita S.', 'vendor sees first name + last initial');
select ok(not exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'vendor_orders'
                        and column_name in ('phone', 'email', 'customer_id')),
          'vendor_orders has no phone, email or customer id');
select ok(exists (select 1 from public.order_events where order_id = (select id from ids where name = 'pending')),
          'vendor reads events of own orders');
select tests.clear_authentication();

select tests.authenticate_as((select id from ids where name = 'w_owner'));
select is((select count(*)::int from public.vendor_orders), 0, 'another vendor sees none of them');
select tests.clear_authentication();

select * from finish();
rollback;
