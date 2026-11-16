-- 0019_featured (T6.4). Plan section 12 calls this 0017_featured.
--   featured_slots: paid placement with a start and an end (BR15).
--   admin_set_featured: AD-10 adds a slot, or edits / ends one early; audit_log.
--   nearby_offers: offers of a vendor with an active slot are featured and
--     come first, still only inside the search radius.
--   featured-expiry cron (hourly): marks ended slots so they drop out.

create table public.featured_slots (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  amount_paid bigint not null default 0 check (amount_paid >= 0),
  note text check (char_length(note) <= 500),
  -- Set by featured-expiry once ends_at has passed; ended slots never show.
  ended boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint featured_slots_end_after_start check (ends_at > starts_at)
);
create index featured_slots_vendor_idx on public.featured_slots (vendor_id, ends_at desc);
create index featured_slots_active_idx on public.featured_slots (vendor_id) where not ended;

-- RLS (section 8): customers see active slots only through nearby_offers;
-- vendors read their own; admin (aal2) all, writes through admin_set_featured.
alter table public.featured_slots enable row level security;
revoke all on public.featured_slots from anon, authenticated;
grant select on public.featured_slots to authenticated;

create policy "featured_slots: vendor reads own"
  on public.featured_slots for select to authenticated
  using (public.jwt_owns_vendor(vendor_id));
create policy "featured_slots: admin reads all"
  on public.featured_slots for select to authenticated
  using ((select public.jwt_is_admin()));

-- Is this vendor featured right now?
create function public.vendor_is_featured(p_vendor_id uuid, p_at timestamptz default now())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.featured_slots f
    where f.vendor_id = p_vendor_id and not f.ended
      and f.starts_at <= p_at and f.ends_at > p_at
  );
$$;
revoke execute on function public.vendor_is_featured(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.vendor_is_featured(uuid, timestamptz) to service_role;

-- AD-10: p_slot_id null adds a slot; otherwise edits that slot (set ends_at
-- to now to end it early). Amount is paisa. Every call writes audit_log.
create function public.admin_set_featured(
  p_vendor_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_amount_paid bigint,
  p_note text default null,
  p_slot_id uuid default null
)
returns public.featured_slots
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.admin_require();
  v_before public.featured_slots%rowtype;
  v_after public.featured_slots%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'ends_at';
  end if;
  if p_amount_paid is null or p_amount_paid < 0 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'amount_paid';
  end if;
  if char_length(coalesce(v_note, '')) > 500 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'note';
  end if;

  if p_slot_id is null then
    if not public.vendor_is_approved(p_vendor_id) then
      raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'vendor_id';
    end if;
    if p_ends_at <= now() then
      raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'ends_at';
    end if;
    insert into public.featured_slots (vendor_id, starts_at, ends_at, amount_paid, note, created_by)
    values (p_vendor_id, p_starts_at, p_ends_at, p_amount_paid, v_note, v_admin)
    returning * into v_after;
  else
    select * into v_before from public.featured_slots
     where id = p_slot_id and vendor_id = p_vendor_id for update;
    if not found then
      raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'slot_id';
    end if;
    update public.featured_slots
       set starts_at = p_starts_at, ends_at = p_ends_at, amount_paid = p_amount_paid,
           note = v_note, ended = p_ends_at <= now(), updated_at = now()
     where id = p_slot_id
    returning * into v_after;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (v_admin, 'admin_set_featured', 'featured_slot', v_after.id::text,
          case when p_slot_id is null then null else to_jsonb(v_before) end, to_jsonb(v_after));
  return v_after;
end;
$$;
revoke execute on function public.admin_set_featured(uuid, timestamptz, timestamptz, bigint, text, uuid)
  from public, anon;
grant execute on function public.admin_set_featured(uuid, timestamptz, timestamptz, bigint, text, uuid)
  to authenticated, service_role;

-- featured-expiry (BR15): ended slots drop out of results (the search also
-- checks ends_at, so a slot never shows past its end even between runs).
create function public.expire_featured()
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update public.featured_slots set ended = true, updated_at = now()
   where not ended and ends_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.expire_featured() from public, anon, authenticated;
grant execute on function public.expire_featured() to service_role;

select cron.schedule('featured-expiry', '0 * * * *', $$select public.expire_featured()$$);

-- nearby_offers: same as 0017 with is_featured from featured_slots.
create or replace function public.nearby_offers(
  p_lat double precision,
  p_lng double precision,
  p_radius_m int default 2000,
  p_kind public.offer_kind default null,
  p_food_type public.food_type default null,
  p_price_min bigint default null,
  p_price_max bigint default null,
  p_pickup_after timestamptz default null,
  p_q text default null,
  p_sort text default 'distance',
  p_page int default 0,
  p_vendor_type public.vendor_type default null
)
returns table (
  id uuid,
  offer_kind public.offer_kind,
  title text,
  title_ne text,
  food_type public.food_type,
  original_price bigint,
  price bigint,
  discount_pct int,
  quantity_left int,
  pickup_start timestamptz,
  pickup_end timestamptz,
  expires_at timestamptz,
  vendor_id uuid,
  vendor_name text,
  vendor_type public.vendor_type,
  lat double precision,
  lng double precision,
  distance_m int,
  is_featured boolean,
  deal_live boolean,
  next_start timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_point extensions.geography;
  v_q tsquery;
  v_like text;
  v_now timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if not public.jwt_is_active() then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'location';
  end if;
  if p_radius_m is null
     or not (coalesce(public.app_setting_public_value('radius_options_m'), '[2000, 3000]'::jsonb)
             @> to_jsonb(p_radius_m)) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'radius_m';
  end if;
  if (p_price_min is not null and p_price_min < 0) or (p_price_max is not null and p_price_max < 0)
     or (p_price_min is not null and p_price_max is not null and p_price_min > p_price_max) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'price_range';
  end if;
  if coalesce(p_sort, 'distance') not in ('distance', 'price', 'discount', 'ending') then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'sort';
  end if;
  if p_page is null or p_page < 0 or p_page > 50 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'page';
  end if;
  if char_length(coalesce(p_q, '')) > 100 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'q';
  end if;

  v_point := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  v_q := public.search_query(p_q);
  v_like := case when btrim(coalesce(p_q, '')) = '' then null
                 else '%' || replace(replace(replace(btrim(p_q), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;

  return query
  with hits as (
    select o.*, v.name as v_name, v.type as v_type,
           extensions.st_distance(o.location, v_point) as dist,
           public.vendor_is_featured(o.vendor_id, v_now) as featured,
           (o.offer_kind = 'happy_hour') as is_deal
    from public.offers o
    join public.vendors v on v.id = o.vendor_id and v.status = 'approved'
    where o.status = 'live'
      and o.location is not null
      and extensions.st_dwithin(o.location, v_point, p_radius_m)
      and (
        (o.offer_kind = 'surplus' and o.expires_at > v_now
          and o.quantity_total - o.quantity_reserved > 0
          and (p_pickup_after is null or o.pickup_end > p_pickup_after))
        or (o.offer_kind = 'happy_hour' and public.is_deal_live(o.id, v_now))
      )
      and (p_kind is null or o.offer_kind = p_kind)
      and (p_food_type is null or o.food_type = p_food_type)
      and (p_vendor_type is null or v.type = p_vendor_type)
      and (p_price_min is null or o.price >= p_price_min)
      and (p_price_max is null or o.price <= p_price_max)
      and (v_like is null
           or (v_q is not null and o.search_tsv @@ v_q)
           or o.title ilike v_like or o.title_ne ilike v_like or v.name ilike v_like)
  )
  select h.id, h.offer_kind, h.title, h.title_ne, h.food_type, h.original_price, h.price,
         h.discount_pct,
         case when h.offer_kind = 'surplus' then h.quantity_total - h.quantity_reserved end,
         h.pickup_start, h.pickup_end, h.expires_at,
         h.vendor_id, h.v_name, h.v_type,
         extensions.st_y(h.location::extensions.geometry),
         extensions.st_x(h.location::extensions.geometry),
         round(h.dist)::int,
         h.featured,
         h.is_deal,
         case when h.is_deal then public.deal_next_start(h.id, v_now) end
  from hits h
  order by h.featured desc,
           case when coalesce(p_sort, 'distance') = 'price' then h.price end asc nulls last,
           case when p_sort = 'discount' then h.discount_pct end desc nulls last,
           case when p_sort = 'ending' then coalesce(h.pickup_end, h.expires_at) end asc nulls last,
           h.dist asc,
           h.id
  limit 20 offset p_page * 20;
end;
$$;
