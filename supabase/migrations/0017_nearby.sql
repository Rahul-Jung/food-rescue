-- 0017_nearby (T5.2, T5.3, T5.7). Plan section 12 calls this 0015_nearby;
-- numbered by the next free number.
--   nearby_offers: C-06 / C-07 / C-08 search. ST_DWithin on geography (GIST
--     index offers_location_gist), filters, happy hour only while
--     is_deal_live (BR14), featured first, then the chosen sort, 20 per page.
--   deal_next_start: when a happy hour deal next starts ("Starts at 5:00 PM").
--   join_waitlist: T5.3 waitlist entry for a point outside the pilot polygon.
--   offers joins the supabase_realtime publication for the T5.7 quantity hook.

-- Next window start strictly after p_at, in Asia/Kathmandu. Null = no windows.
create function public.deal_next_start(p_offer_id uuid, p_at timestamptz default now())
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select min(((((p_at at time zone 'Asia/Kathmandu')::date + d) + s.start_time)
              at time zone 'Asia/Kathmandu'))
  from public.deal_schedules s
  cross join generate_series(0, 7) d
  where s.offer_id = p_offer_id
    and extract(dow from (p_at at time zone 'Asia/Kathmandu')::date + d)::int = s.day_of_week
    and ((((p_at at time zone 'Asia/Kathmandu')::date + d) + s.start_time)
          at time zone 'Asia/Kathmandu') > p_at;
$$;
revoke execute on function public.deal_next_start(uuid, timestamptz) from public;
grant execute on function public.deal_next_start(uuid, timestamptz) to anon, authenticated, service_role;

-- Search text to a prefix tsquery ("mom" finds "momo"); null when empty.
create function public.search_query(p_q text)
returns tsquery
language sql
immutable
set search_path = ''
as $$
  select case when count(*) = 0 then null
         else to_tsquery('simple', string_agg(quote_literal(w) || ':*', ' & ')) end
  from regexp_split_to_table(
         btrim(regexp_replace(lower(coalesce(p_q, '')), '[^[:alnum:][:space:]ऀ-ॿ]+', ' ', 'g')),
         '\s+') w
  where w <> '';
$$;
revoke execute on function public.search_query(text) from public;
grant execute on function public.search_query(text) to authenticated, service_role;

create function public.nearby_offers(
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
           -- featured_slots arrive with AD-? in S8; until then nothing is featured.
           false as featured,
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
revoke execute on function public.nearby_offers(double precision, double precision, int,
  public.offer_kind, public.food_type, bigint, bigint, timestamptz, text, text, int, public.vendor_type)
  from public, anon;
grant execute on function public.nearby_offers(double precision, double precision, int,
  public.offer_kind, public.food_type, bigint, bigint, timestamptz, text, text, int, public.vendor_type)
  to authenticated, service_role;

-- T5.3: someone outside the pilot polygon leaves a phone or email (+ area).
create function public.join_waitlist(
  p_contact text,
  p_area text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_contact text := btrim(coalesce(p_contact, ''));
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if v_contact !~ '^\+?[0-9]{7,15}$' and v_contact !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or char_length(v_contact) > 254 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'contact';
  end if;
  if char_length(coalesce(p_area, '')) > 120 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'area';
  end if;
  if (p_lat is null) <> (p_lng is null)
     or (p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180)) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'location';
  end if;
  insert into public.waitlist (contact, area, point)
  values (
    v_contact,
    nullif(btrim(coalesce(p_area, '')), ''),
    case when p_lat is not null
         then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography end
  )
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.join_waitlist(text, text, double precision, double precision) from public, anon;
grant execute on function public.join_waitlist(text, text, double precision, double precision)
  to authenticated, service_role;

-- T5.7: quantity changes reach open screens (offers:id=eq.{id}). Realtime
-- applies the offers RLS, so customers only hear about live offers.
alter publication supabase_realtime add table public.offers;
