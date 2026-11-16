-- 0013_offer_rpcs (T4.2): create_offer, update_offer, set_offer_status,
-- clone_offer, plus confirm_offer_images ("draft until images confirm", T4.3).
-- Plan section 12 calls this 0012_offer_rpcs; 0012 holds the T4.1 tables.
-- Errors use the section 6 codes: VENDOR_NOT_APPROVED, STALE_VERSION,
-- OPEN_ORDERS_EXIST, VALIDATION_FAILED (detail = the field), FORBIDDEN.

-- Helpers ---------------------------------------------------------------------

-- The caller's vendor row, locked; checks the account is active.
create function public.caller_vendor()
returns public.vendors
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.vendors%rowtype;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if not public.jwt_is_active() then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  select * into v from public.vendors where owner_id = auth.uid() for update;
  if not found then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return v;
end;
$$;

-- The caller's own offer, locked.
create function public.caller_offer(p_offer_id uuid)
returns public.offers
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.vendors%rowtype := public.caller_vendor();
  o public.offers%rowtype;
begin
  select * into o from public.offers where id = p_offer_id and vendor_id = v.id for update;
  if not found then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return o;
end;
$$;

-- Open orders on an offer (pending payment or paid). The orders table comes
-- in S6; until then this is 0. It looks the table up at run time so it starts
-- counting as soon as orders exist.
create function public.offer_open_orders(p_offer_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  n int := 0;
begin
  if to_regclass('public.orders') is not null then
    execute 'select count(*)::int from public.orders where offer_id = $1
             and status::text in (''pending_payment'', ''paid'')'
      into n using p_offer_id;
  end if;
  return n;
end;
$$;

create function public.jsonb_text(p jsonb, k text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(btrim(p ->> k), '');
$$;

-- Time rules of V1 that need "now" (the table checks hold the rest).
create function public.check_surplus_times(p_start timestamptz, p_end timestamptz, p_expires timestamptz)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'pickup_end';
  end if;
  if p_end <= now() then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'pickup_end';
  end if;
  if p_expires is null or p_expires > p_end then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'expires_at';
  end if;
  if p_expires <= now() then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'expires_at';
  end if;
end;
$$;

-- Turns a table CHECK failure into VALIDATION_FAILED with the constraint name.
create function public.raise_offer_check(p_constraint text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = coalesce(p_constraint, 'offer');
end;
$$;

-- create_offer (V-08 / V-09): a surplus offer as a draft. Publishing is
-- set_offer_status(id, 'live') after the photos are confirmed.
create function public.create_offer(p_offer jsonb)
returns public.offers
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.vendors%rowtype := public.caller_vendor();
  o public.offers%rowtype;
  v_start timestamptz;
  v_end timestamptz;
  v_expires timestamptz;
  v_constraint text;
begin
  if v.status <> 'approved' then
    raise exception 'VENDOR_NOT_APPROVED' using errcode = '42501';
  end if;
  begin
    v_start := (p_offer ->> 'pickup_start')::timestamptz;
    v_end := (p_offer ->> 'pickup_end')::timestamptz;
    v_expires := coalesce((p_offer ->> 'expires_at')::timestamptz, v_end);
  exception when others then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'pickup_start';
  end;
  perform public.check_surplus_times(v_start, v_end, v_expires);

  begin
    insert into public.offers (
      vendor_id, offer_kind, title, title_ne, description, ingredients, food_type, weight_g,
      original_price, price, quantity_total, pickup_start, pickup_end, expires_at, status
    ) values (
      v.id, 'surplus',
      public.jsonb_text(p_offer, 'title'),
      public.jsonb_text(p_offer, 'title_ne'),
      public.jsonb_text(p_offer, 'description'),
      public.jsonb_text(p_offer, 'ingredients'),
      (p_offer ->> 'food_type')::public.food_type,
      (p_offer ->> 'weight_g')::int,
      (p_offer ->> 'original_price')::bigint,
      (p_offer ->> 'price')::bigint,
      (p_offer ->> 'quantity_total')::int,
      v_start, v_end, v_expires, 'draft'
    )
    returning * into o;
  exception
    when check_violation or not_null_violation then
      get stacked diagnostics v_constraint = constraint_name;
      perform public.raise_offer_check(v_constraint);
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'number';
  end;
  return o;
end;
$$;

-- update_offer (V-10): version check (STALE_VERSION), quantity can't drop
-- below what is reserved, pickup time can only be extended once orders exist.
-- Existing orders keep their own price snapshot (S6), so price may change.
create function public.update_offer(p_offer_id uuid, p_version int, p_changes jsonb)
returns public.offers
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  o public.offers%rowtype := public.caller_offer(p_offer_id);
  n public.offers%rowtype;
  v_has_orders boolean;
  v_constraint text;
begin
  if o.version <> p_version then
    raise exception 'STALE_VERSION' using errcode = '22023';
  end if;
  if o.status in ('expired', 'deleted') then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'status';
  end if;
  if o.offer_kind <> 'surplus' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'offer_kind';
  end if;

  n := o;
  begin
    if p_changes ? 'title' then n.title := public.jsonb_text(p_changes, 'title'); end if;
    if p_changes ? 'title_ne' then n.title_ne := public.jsonb_text(p_changes, 'title_ne'); end if;
    if p_changes ? 'description' then n.description := public.jsonb_text(p_changes, 'description'); end if;
    if p_changes ? 'ingredients' then n.ingredients := public.jsonb_text(p_changes, 'ingredients'); end if;
    if p_changes ? 'food_type' then n.food_type := (p_changes ->> 'food_type')::public.food_type; end if;
    if p_changes ? 'weight_g' then n.weight_g := (p_changes ->> 'weight_g')::int; end if;
    if p_changes ? 'original_price' then n.original_price := (p_changes ->> 'original_price')::bigint; end if;
    if p_changes ? 'price' then n.price := (p_changes ->> 'price')::bigint; end if;
    if p_changes ? 'quantity_total' then n.quantity_total := (p_changes ->> 'quantity_total')::int; end if;
    if p_changes ? 'pickup_start' then n.pickup_start := (p_changes ->> 'pickup_start')::timestamptz; end if;
    if p_changes ? 'pickup_end' then n.pickup_end := (p_changes ->> 'pickup_end')::timestamptz; end if;
    if p_changes ? 'expires_at' then n.expires_at := (p_changes ->> 'expires_at')::timestamptz; end if;
  exception when others then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'number';
  end;

  -- V2: quantity floor.
  if n.quantity_total is null or n.quantity_total < o.quantity_reserved then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'quantity_total';
  end if;

  -- Once anyone has reserved, the pickup window may only grow.
  v_has_orders := o.quantity_reserved > 0 or public.offer_open_orders(o.id) > 0;
  if v_has_orders and (n.pickup_start > o.pickup_start or n.pickup_end < o.pickup_end) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'pickup_extend_only';
  end if;

  if n.pickup_start is distinct from o.pickup_start
     or n.pickup_end is distinct from o.pickup_end
     or n.expires_at is distinct from o.expires_at then
    perform public.check_surplus_times(n.pickup_start, n.pickup_end, n.expires_at);
  end if;

  -- Sold out follows the numbers: more units reopen it, a full offer closes.
  if n.status = 'sold_out' and n.quantity_reserved < n.quantity_total then
    n.status := 'live';
  elsif n.status = 'live' and n.quantity_reserved >= n.quantity_total then
    n.status := 'sold_out';
  end if;

  begin
    update public.offers set
      title = n.title, title_ne = n.title_ne, description = n.description,
      ingredients = n.ingredients, food_type = n.food_type, weight_g = n.weight_g,
      original_price = n.original_price, price = n.price, quantity_total = n.quantity_total,
      pickup_start = n.pickup_start, pickup_end = n.pickup_end, expires_at = n.expires_at,
      status = n.status, version = o.version + 1
    where id = o.id
    returning * into n;
  exception
    when check_violation or not_null_violation then
      get stacked diagnostics v_constraint = constraint_name;
      perform public.raise_offer_check(v_constraint);
  end;
  return n;
end;
$$;

-- confirm_offer_images (T4.3): the app uploads offers/{vendor}/{offer}/{n}.webp
-- (and {n}_thumb.webp) through upload-sign, then confirms the slots to keep.
-- A slot keeps its current photo (e.g. one a copy reused from the old offer)
-- unless a new file was uploaded for it. Only files that exist are accepted.
create function public.confirm_offer_images(p_offer_id uuid, p_positions int[])
returns setof public.offer_images
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  o public.offers%rowtype := public.caller_offer(p_offer_id);
  n int;
  v_new text;
  v_old text;
  v_paths text[] := '{}';
begin
  if p_positions is null or cardinality(p_positions) = 0 or cardinality(p_positions) > 5
     or (select count(distinct x) from unnest(p_positions) x) <> cardinality(p_positions)
     or exists (select 1 from unnest(p_positions) x where x < 0 or x > 4) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'images';
  end if;
  foreach n in array p_positions loop
    v_new := format('offers/%s/%s/%s.webp', o.vendor_id, o.id, n);
    select path into v_old from public.offer_images where offer_id = o.id and position = n;
    if exists (select 1 from storage.objects where bucket_id = 'public-images' and name = v_new) then
      v_paths := v_paths || v_new;
    elsif v_old is not null
      and exists (select 1 from storage.objects where bucket_id = 'public-images' and name = v_old) then
      v_paths := v_paths || v_old;
    else
      raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'images';
    end if;
  end loop;

  delete from public.offer_images where offer_id = o.id;
  insert into public.offer_images (offer_id, path, position)
  select o.id, v_paths[i], p_positions[i]
  from generate_subscripts(p_positions, 1) i;

  update public.offers set version = version + 1 where id = o.id;
  return query select * from public.offer_images where offer_id = o.id order by position;
end;
$$;

-- Checks for draft / deactivated -> live (publish, or turn back on).
create function public.check_can_go_live(o public.offers)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.vendor_is_approved(o.vendor_id) then
    raise exception 'VENDOR_NOT_APPROVED' using errcode = '42501';
  end if;
  if not exists (select 1 from public.offer_images where offer_id = o.id) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'images';
  end if;
  if o.offer_kind = 'surplus' then
    if o.expires_at <= now() then
      raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'expires_at';
    end if;
    if o.quantity_reserved >= o.quantity_total then
      raise exception 'QUANTITY_EXCEEDED' using errcode = '22023';
    end if;
  elsif not exists (select 1 from public.deal_schedules where offer_id = o.id) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'schedules';
  end if;
end;
$$;

-- set_offer_status (V-07): publish, sold out, deactivate (deals: pause), turn
-- back on, delete (soft; blocked while open orders exist).
create function public.set_offer_status(p_offer_id uuid, p_status public.offer_status)
returns public.offers
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  o public.offers%rowtype := public.caller_offer(p_offer_id);
  n public.offers%rowtype;
begin
  if o.status = p_status then
    return o;
  end if;

  if p_status = 'live' then
    if o.status = 'sold_out' then
      if o.quantity_reserved >= o.quantity_total or o.expires_at <= now() then
        raise exception 'QUANTITY_EXCEEDED' using errcode = '22023';
      end if;
    elsif o.status in ('draft', 'deactivated') then
      perform public.check_can_go_live(o);
    else
      raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'status';
    end if;
  elsif p_status = 'sold_out' then
    if o.status <> 'live' or o.offer_kind <> 'surplus' then
      raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'status';
    end if;
  elsif p_status = 'deactivated' then
    if o.status not in ('live', 'sold_out') then
      raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'status';
    end if;
  elsif p_status = 'deleted' then
    if public.offer_open_orders(o.id) > 0 then
      raise exception 'OPEN_ORDERS_EXIST' using errcode = '22023';
    end if;
  else
    -- expired is set only by the expire-offers job.
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'status';
  end if;

  update public.offers set status = p_status, version = version + 1
  where id = o.id returning * into n;
  return n;
end;
$$;

-- clone_offer (V-11): "one tap makes a live copy with today's times". The
-- copy reuses the old photos; if there are none it stays a draft and the app
-- asks for a photo.
create function public.clone_offer(
  p_offer_id uuid,
  p_pickup_start timestamptz,
  p_pickup_end timestamptz,
  p_expires_at timestamptz default null
)
returns public.offers
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  src public.offers%rowtype := public.caller_offer(p_offer_id);
  v_expires timestamptz := coalesce(p_expires_at, p_pickup_end);
  n public.offers%rowtype;
  v_today date := (now() at time zone 'Asia/Kathmandu')::date;
begin
  if src.offer_kind <> 'surplus' or src.status = 'deleted' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'offer_kind';
  end if;
  if not public.vendor_is_approved(src.vendor_id) then
    raise exception 'VENDOR_NOT_APPROVED' using errcode = '42501';
  end if;
  if (p_pickup_start at time zone 'Asia/Kathmandu')::date <> v_today then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'pickup_start';
  end if;
  perform public.check_surplus_times(p_pickup_start, p_pickup_end, v_expires);

  insert into public.offers (
    vendor_id, offer_kind, title, title_ne, description, ingredients, food_type, weight_g,
    original_price, price, quantity_total, pickup_start, pickup_end, expires_at, status
  ) values (
    src.vendor_id, 'surplus', src.title, src.title_ne, src.description, src.ingredients,
    src.food_type, src.weight_g, src.original_price, src.price, src.quantity_total,
    p_pickup_start, p_pickup_end, v_expires, 'draft'
  ) returning * into n;

  insert into public.offer_images (offer_id, path, position)
  select n.id, i.path, i.position
  from public.offer_images i
  join storage.objects s on s.bucket_id = 'public-images' and s.name = i.path
  where i.offer_id = src.id;

  if exists (select 1 from public.offer_images where offer_id = n.id) then
    update public.offers set status = 'live' where id = n.id returning * into n;
  end if;
  return n;
end;
$$;

-- Grants -------------------------------------------------------------------------
revoke execute on function public.caller_vendor() from public, anon, authenticated;
revoke execute on function public.caller_offer(uuid) from public, anon, authenticated;
revoke execute on function public.offer_open_orders(uuid) from public, anon, authenticated;
revoke execute on function public.check_surplus_times(timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.raise_offer_check(text) from public, anon, authenticated;
revoke execute on function public.check_can_go_live(public.offers) from public, anon, authenticated;
revoke execute on function public.create_offer(jsonb) from public, anon;
revoke execute on function public.update_offer(uuid, int, jsonb) from public, anon;
revoke execute on function public.confirm_offer_images(uuid, int[]) from public, anon;
revoke execute on function public.set_offer_status(uuid, public.offer_status) from public, anon;
revoke execute on function public.clone_offer(uuid, timestamptz, timestamptz, timestamptz) from public, anon;

grant execute on function public.create_offer(jsonb) to authenticated;
grant execute on function public.update_offer(uuid, int, jsonb) to authenticated;
grant execute on function public.confirm_offer_images(uuid, int[]) to authenticated;
grant execute on function public.set_offer_status(uuid, public.offer_status) to authenticated;
grant execute on function public.clone_offer(uuid, timestamptz, timestamptz, timestamptz) to authenticated;
