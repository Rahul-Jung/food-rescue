-- 0021_cron_holds (T6.6). Plan section 12 calls this 0019_cron_holds.
--   create_order_hold: the database half of the create-order Edge Function.
--     One transaction: locks the offer row (SELECT ... FOR UPDATE), checks
--     quantity left, max per order and the per-user rate limit, snapshots
--     unit_price and commission_rate_bp (0 inside the free period), creates
--     the pending_payment order with hold_expires_at = now + hold_minutes and
--     adds to quantity_reserved (BR1, BR3, BR9). Service role only.
--   release_holds + release-holds cron (every minute): pending_payment past
--     hold_expires_at with no verified payment -> expired_hold; the units go
--     back to the offer (BR1).

create function public.create_order_hold(p_customer_id uuid, p_offer_id uuid, p_quantity int)
returns public.orders
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c public.profiles%rowtype;
  o public.offers%rowtype;
  v public.vendors%rowtype;
  n public.orders%rowtype;
  v_max int := (public.app_setting('max_order_qty_per_order') #>> '{}')::int;
  v_rate int := (public.app_setting('order_rate_per_minute') #>> '{}')::int;
  v_hold int := (public.app_setting('hold_minutes') #>> '{}')::int;
  v_recent int;
  v_rate_bp int;
begin
  -- Lock the customer row first so one person's parallel taps queue up and
  -- the rate limit counts them all.
  select * into c from public.profiles where id = p_customer_id for update;
  if not found then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if c.status <> 'active' then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > v_max then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'quantity';
  end if;

  select count(*) into v_recent from public.orders
   where customer_id = p_customer_id and created_at > now() - interval '1 minute';
  if v_recent >= v_rate then
    raise exception 'RATE_LIMITED' using errcode = '22023';
  end if;

  -- The row lock: two buyers of the last unit queue here; the second one
  -- sees the first one's reservation.
  select * into o from public.offers where id = p_offer_id for update;
  if not found or o.offer_kind <> 'surplus' then
    raise exception 'OFFER_UNAVAILABLE' using errcode = '22023';
  end if;
  select * into v from public.vendors where id = o.vendor_id;
  if v.status <> 'approved' or o.status not in ('live', 'sold_out') or o.expires_at <= now() then
    raise exception 'OFFER_UNAVAILABLE' using errcode = '22023';
  end if;
  if o.status = 'sold_out' or o.quantity_total - o.quantity_reserved < p_quantity then
    raise exception 'QUANTITY_EXCEEDED' using errcode = '22023';
  end if;

  v_rate_bp := case when v.commission_free_until is not null and now() < v.commission_free_until
                    then 0 else v.commission_rate_bp end;

  insert into public.orders (customer_id, vendor_id, offer_id, quantity, unit_price, total,
                             commission_rate_bp, status, hold_expires_at)
  values (c.id, v.id, o.id, p_quantity, o.price, o.price * p_quantity,
          v_rate_bp, 'pending_payment', now() + make_interval(mins => v_hold))
  returning * into n;

  -- "(new) -> pending_payment" is the first event of every order.
  insert into public.order_events (order_id, from_status, to_status, actor_id, reason)
  values (n.id, null, 'pending_payment', c.id, null);

  update public.offers
     set quantity_reserved = quantity_reserved + p_quantity,
         status = case when quantity_reserved + p_quantity >= quantity_total
                       then 'sold_out'::public.offer_status else status end
   where id = o.id;
  return n;
end;
$$;
revoke execute on function public.create_order_hold(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.create_order_hold(uuid, uuid, int) to service_role;

-- Has this order a verified payment? payments arrives in S7 (T7.x); until
-- then nothing is verified. Looked up at run time like offer_open_orders.
create function public.order_has_verified_payment(p_order_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  b boolean := false;
begin
  if to_regclass('public.payments') is not null then
    execute 'select exists (select 1 from public.payments where order_id = $1
             and status::text = ''verified'')'
      into b using p_order_id;
  end if;
  return b;
end;
$$;
revoke execute on function public.order_has_verified_payment(uuid) from public, anon, authenticated;
grant execute on function public.order_has_verified_payment(uuid) to service_role;

create function public.release_holds()
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id, offer_id, quantity from public.orders
     where status = 'pending_payment' and hold_expires_at <= now()
     order by hold_expires_at
     for update skip locked
  loop
    continue when public.order_has_verified_payment(r.id);
    perform public.transition_order(r.id, 'expired_hold', null, 'hold expired');
    -- Units go back; a sold-out offer opens again while it has not expired.
    update public.offers
       set quantity_reserved = greatest(quantity_reserved - r.quantity, 0),
           status = case when status = 'sold_out' and expires_at > now()
                         then 'live'::public.offer_status else status end
     where id = r.offer_id;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.release_holds() from public, anon, authenticated;
grant execute on function public.release_holds() to service_role;

select cron.schedule('release-holds', '* * * * *', $$select public.release_holds()$$);
