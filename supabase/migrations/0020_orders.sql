-- 0020_orders (T6.5). Plan section 12 calls this 0018_orders.
--   orders, order_events (insert-only), transition_order() (the only way
--   orders.status changes; allowed moves of plan section 4), generate_pickup_code(),
--   RLS (section 8), vendor_orders view (customer first name + last initial,
--   never phone or email, N7).
-- Money is paisa. unit_price and commission_rate_bp are snapshots taken by
-- create-order, so later offer or commission edits never change an order.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- 6-digit pickup code, issued when the order is paid.
  code char(6) check (code ~ '^[0-9]{6}$'),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  offer_id uuid not null references public.offers (id) on delete restrict,
  quantity int not null check (quantity >= 1),
  unit_price bigint not null check (unit_price > 0),
  total bigint not null check (total > 0),
  commission_rate_bp int not null check (commission_rate_bp between 0 and 5000),
  status public.order_status not null default 'pending_payment',
  hold_expires_at timestamptz,
  paid_at timestamptz,
  collected_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) <= 500),
  cancelled_by uuid references public.profiles (id),
  payment_mode text not null default 'online' check (payment_mode in ('online', 'at_pickup')),
  code_attempts int not null default 0 check (code_attempts >= 0),
  code_locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_matches check (total = unit_price * quantity)
);

create unique index orders_vendor_open_code_key on public.orders (vendor_id, code)
  where status in ('pending_payment', 'paid');
create index orders_vendor_status_idx on public.orders (vendor_id, status);
create index orders_customer_created_idx on public.orders (customer_id, created_at desc);
create index orders_offer_idx on public.orders (offer_id, status);
create index orders_hold_idx on public.orders (hold_expires_at) where status = 'pending_payment';

create table public.order_events (
  id bigserial primary key,
  order_id uuid not null references public.orders (id) on delete restrict,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_id uuid,
  reason text,
  at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, at);

-- order_events is insert-only (BR12): nobody, including admin, updates or deletes.
create function public.order_events_block_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'order_events is insert-only' using errcode = '42501';
end;
$$;
create trigger order_events_no_update_delete
  before update or delete on public.order_events
  for each row execute function public.order_events_block_change();
create trigger order_events_no_truncate
  before truncate on public.order_events
  for each statement execute function public.order_events_block_change();
revoke execute on function public.order_events_block_change() from public, anon, authenticated;

-- Only transition_order() may change orders.status: it sets a transaction
-- flag the guard below checks.
create function public.orders_guard_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.order_transition', true), '') <> 'on' then
    raise exception 'orders.status changes only through transition_order' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger orders_guard_status
  before update on public.orders
  for each row execute function public.orders_guard_status();
revoke execute on function public.orders_guard_status() from public, anon, authenticated;

-- Allowed moves (plan section 4). Mirrors ORDER_TRANSITIONS in packages/shared.
create function public.order_move_allowed(p_from public.order_status, p_to public.order_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from, p_to) in (
    ('pending_payment'::public.order_status, 'paid'::public.order_status),
    ('pending_payment', 'expired_hold'),
    ('paid', 'collected'),
    ('paid', 'no_show'),
    ('paid', 'cancelled_by_customer'),
    ('paid', 'cancelled_by_vendor'),
    ('cancelled_by_customer', 'refunded'),
    ('cancelled_by_vendor', 'refunded'),
    ('collected', 'refunded'),
    ('no_show', 'refunded')
  );
$$;
grant execute on function public.order_move_allowed(public.order_status, public.order_status)
  to authenticated, service_role;

-- A random 6-digit code not used by another open order of this vendor.
create function public.generate_pickup_code(p_vendor_id uuid)
returns char(6)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code char(6);
  i int := 0;
begin
  loop
    i := i + 1;
    -- crypto-strong bytes (pgcrypto), not random(): codes must not be guessable.
    v_code := lpad(((('x' || lpad(encode(extensions.gen_random_bytes(4), 'hex'), 16, '0'))::bit(64)::bigint
                    % 1000000))::text, 6, '0');
    exit when not exists (
      select 1 from public.orders
      where vendor_id = p_vendor_id and code = v_code and status in ('pending_payment', 'paid')
    );
    if i > 50 then
      raise exception 'could not issue a pickup code' using errcode = 'P0001';
    end if;
  end loop;
  return v_code;
end;
$$;
revoke execute on function public.generate_pickup_code(uuid) from public, anon, authenticated;
grant execute on function public.generate_pickup_code(uuid) to service_role;

-- transition_order (internal, not exposed to the apps): rejects any move not
-- in the table, writes exactly one order_events row per change, stamps the
-- time columns and issues the pickup code on paid. Money, quantity and
-- notification side effects belong to the callers (create-order,
-- release-holds, payment-verify, confirm_pickup, ...), inside the same
-- transaction.
create function public.transition_order(
  p_order_id uuid,
  p_to_status public.order_status,
  p_actor_id uuid default null,
  p_reason text default null
)
returns public.orders
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
  n public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'order_id';
  end if;
  if p_to_status is null or not public.order_move_allowed(o.status, p_to_status) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023',
      detail = format('transition %s -> %s', o.status, p_to_status);
  end if;

  perform set_config('app.order_transition', 'on', true);
  update public.orders set
    status = p_to_status,
    paid_at = case when p_to_status = 'paid' then now() else paid_at end,
    code = case when p_to_status = 'paid' and code is null
                then public.generate_pickup_code(vendor_id) else code end,
    collected_at = case when p_to_status = 'collected' then now() else collected_at end,
    cancelled_at = case when p_to_status in ('cancelled_by_customer', 'cancelled_by_vendor')
                        then now() else cancelled_at end,
    cancelled_by = case when p_to_status in ('cancelled_by_customer', 'cancelled_by_vendor')
                        then p_actor_id else cancelled_by end,
    cancel_reason = case when p_to_status in ('cancelled_by_customer', 'cancelled_by_vendor')
                         then nullif(btrim(coalesce(p_reason, '')), '') else cancel_reason end
  where id = o.id
  returning * into n;
  perform set_config('app.order_transition', 'off', true);

  insert into public.order_events (order_id, from_status, to_status, actor_id, reason)
  values (o.id, o.status, p_to_status, p_actor_id, nullif(btrim(coalesce(p_reason, '')), ''));
  return n;
end;
$$;
revoke execute on function public.transition_order(uuid, public.order_status, uuid, text)
  from public, anon, authenticated;
grant execute on function public.transition_order(uuid, public.order_status, uuid, text) to service_role;

-- RLS (section 8) ------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_events enable row level security;

revoke all on public.orders, public.order_events from anon, authenticated;
grant select on public.orders, public.order_events to authenticated;
revoke update, delete, truncate on public.order_events from service_role;

-- Customers read their own orders; vendors read theirs through vendor_orders
-- (no customer phone or email); admin (aal2) reads all. Nobody writes orders
-- from the apps: create-order and the order functions do.
create policy "orders: customer reads own"
  on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) and (select public.jwt_is_active()));
create policy "orders: admin reads all"
  on public.orders for select to authenticated
  using ((select public.jwt_is_admin()));

create function public.order_visible_to(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.jwt_is_active() and exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (o.customer_id = auth.uid() or public.jwt_owns_vendor(o.vendor_id))
  );
$$;
revoke execute on function public.order_visible_to(uuid) from public, anon;
grant execute on function public.order_visible_to(uuid) to authenticated, service_role;

create policy "order_events: customer or vendor reads own orders'"
  on public.order_events for select to authenticated
  using (public.order_visible_to(order_id));
create policy "order_events: admin reads all"
  on public.order_events for select to authenticated
  using ((select public.jwt_is_admin()));

-- "Sita K." from the profile name; never phone or email (N7).
create function public.short_name(p_full_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when btrim(coalesce(p_full_name, '')) = '' then null
    when array_length(regexp_split_to_array(btrim(p_full_name), '\s+'), 1) = 1 then btrim(p_full_name)
    else (regexp_split_to_array(btrim(p_full_name), '\s+'))[1] || ' '
         || left((regexp_split_to_array(btrim(p_full_name), '\s+'))[
              array_length(regexp_split_to_array(btrim(p_full_name), '\s+'), 1)], 1) || '.'
  end;
$$;
grant execute on function public.short_name(text) to authenticated, service_role;

-- vendor_orders (V-13): the vendor's own orders, customer shown as first name
-- + last initial. Runs as the view owner, filtered to the caller's vendor.
create view public.vendor_orders
with (security_barrier = true)
as
select o.id, o.code, o.vendor_id, o.offer_id, f.title as offer_title, o.quantity,
       o.unit_price, o.total, o.commission_rate_bp, o.status, o.hold_expires_at, o.paid_at,
       o.collected_at, o.cancelled_at, o.cancel_reason, o.payment_mode,
       f.pickup_start, f.pickup_end,
       public.short_name(p.full_name) as customer_name,
       o.created_at, o.updated_at
from public.orders o
join public.offers f on f.id = o.offer_id
join public.profiles p on p.id = o.customer_id
where public.jwt_owns_vendor(o.vendor_id);

revoke all on public.vendor_orders from anon, authenticated;
grant select on public.vendor_orders to authenticated;
