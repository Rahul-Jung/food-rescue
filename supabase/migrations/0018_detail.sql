-- 0018_detail (T6.1, T6.2, T6.3). Plan section 12 calls this 0016_detail;
-- numbered by the next free number.
--   offer_detail: C-10 offer detail and C-12 deal pass. Offer + images +
--     vendor public fields + rating; hides suspended vendors and deleted
--     (also draft / paused) offers. Sold-out and expired offers still come
--     back so the app can show those states with Reserve disabled.
--   vendor_page: C-11. Approved vendors only: public fields, hours, live
--     offers (sold-out ones greyed), live and upcoming deals, 10 newest
--     visible reviews (reviews arrive in S7, so the list is empty for now).
--   deal_live_until: when the window a deal is live in ends ("Live until 7:00 PM").

-- End of the window this deal is live in at p_at, in Asia/Kathmandu; null
-- when it is not live. A window belongs to the day it starts on (same rule
-- as is_deal_live), so a 9 PM - 1 AM window started yesterday counts.
create function public.deal_live_until(p_offer_id uuid, p_at timestamptz default now())
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(w.ends_at)
  from (
    select st, st + case when s.end_time > s.start_time then s.end_time - s.start_time
                         else s.end_time - s.start_time + interval '24 hours' end as ends_at
    from public.offers o
    join public.vendors v on v.id = o.vendor_id and v.status = 'approved'
    join public.deal_schedules s on s.offer_id = o.id
    cross join generate_series(-1, 0) d
    cross join lateral (
      select ((((p_at at time zone 'Asia/Kathmandu')::date + d) + s.start_time)
              at time zone 'Asia/Kathmandu') as st
    ) x
    where o.id = p_offer_id
      and o.offer_kind = 'happy_hour'
      and o.status = 'live'
      and extract(dow from (p_at at time zone 'Asia/Kathmandu')::date + d)::int = s.day_of_week
  ) w
  where w.st <= p_at and p_at < w.ends_at;
$$;
revoke execute on function public.deal_live_until(uuid, timestamptz) from public;
grant execute on function public.deal_live_until(uuid, timestamptz) to anon, authenticated, service_role;

-- The public vendor card used by both pages (never PAN, payout or commission).
create function public.vendor_public_json(v public.vendors)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', v.id, 'name', v.name, 'type', v.type, 'logo_url', v.logo_url,
    'description', v.description, 'area', v.area, 'landmark', v.landmark,
    'address', v.address, 'lat', public.lat(v), 'lng', public.lng(v), 'phone', v.phone,
    -- vendor_stats (reviews) lands in S7.
    'rating_avg', null, 'rating_count', 0
  );
$$;
revoke execute on function public.vendor_public_json(public.vendors) from public, anon, authenticated;

-- What a customer sees of one offer, with the state the app should show.
create function public.offer_public_json(o public.offers, p_at timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id, 'vendor_id', o.vendor_id, 'offer_kind', o.offer_kind,
    'title', o.title, 'title_ne', o.title_ne, 'description', o.description,
    'ingredients', o.ingredients, 'food_type', o.food_type, 'weight_g', o.weight_g,
    'original_price', o.original_price, 'price', o.price,
    'deal_discount_pct', o.deal_discount_pct, 'discount_pct', o.discount_pct,
    'quantity_total', o.quantity_total,
    'quantity_left', case when o.offer_kind = 'surplus'
                          then greatest(o.quantity_total - o.quantity_reserved, 0) end,
    'pickup_start', o.pickup_start, 'pickup_end', o.pickup_end, 'expires_at', o.expires_at,
    -- The cron flips status within a minute; show the true state at once.
    'status', case
                when o.offer_kind = 'surplus' and o.status in ('live', 'sold_out')
                     and o.expires_at <= p_at then 'expired'
                when o.offer_kind = 'surplus' and o.status = 'live'
                     and o.quantity_reserved >= o.quantity_total then 'sold_out'
                else o.status::text end,
    'version', o.version,
    'images', coalesce((select jsonb_agg(jsonb_build_object('path', i.path, 'position', i.position)
                                         order by i.position)
                        from public.offer_images i where i.offer_id = o.id), '[]'::jsonb),
    'schedules', coalesce((select jsonb_agg(jsonb_build_object(
                                    'day_of_week', s.day_of_week,
                                    'start_time', to_char(s.start_time, 'HH24:MI'),
                                    'end_time', to_char(s.end_time, 'HH24:MI'))
                                  order by s.day_of_week, s.start_time)
                           from public.deal_schedules s where s.offer_id = o.id), '[]'::jsonb),
    'deal_live', case when o.offer_kind = 'happy_hour' then public.is_deal_live(o.id, p_at) end,
    'live_until', case when o.offer_kind = 'happy_hour' then public.deal_live_until(o.id, p_at) end,
    'next_start', case when o.offer_kind = 'happy_hour' then public.deal_next_start(o.id, p_at) end
  );
$$;
revoke execute on function public.offer_public_json(public.offers, timestamptz) from public, anon, authenticated;

create function public.offer_detail(p_offer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  o public.offers%rowtype;
  v public.vendors%rowtype;
  v_now timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if not public.jwt_is_active() then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  select * into o from public.offers where id = p_offer_id;
  if not found or o.status not in ('live', 'sold_out', 'expired') then
    raise exception 'OFFER_UNAVAILABLE' using errcode = '22023';
  end if;
  select * into v from public.vendors where id = o.vendor_id;
  if v.status <> 'approved' then
    raise exception 'OFFER_UNAVAILABLE' using errcode = '22023';
  end if;
  return public.offer_public_json(o, v_now)
    || jsonb_build_object('vendor', public.vendor_public_json(v), 'server_now', v_now);
end;
$$;
revoke execute on function public.offer_detail(uuid) from public, anon;
grant execute on function public.offer_detail(uuid) to authenticated, service_role;

create function public.vendor_page(p_vendor_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.vendors%rowtype;
  v_now timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if not public.jwt_is_active() then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  select * into v from public.vendors where id = p_vendor_id;
  if not found or v.status <> 'approved' then
    raise exception 'OFFER_UNAVAILABLE' using errcode = '22023';
  end if;

  return public.vendor_public_json(v) || jsonb_build_object(
    'hours', coalesce((select jsonb_agg(jsonb_build_object(
                                 'day_of_week', h.day_of_week,
                                 'opens', to_char(h.opens, 'HH24:MI'),
                                 'closes', to_char(h.closes, 'HH24:MI'))
                               order by h.day_of_week)
                       from public.vendor_hours h where h.vendor_id = v.id), '[]'::jsonb),
    -- Surplus offers still running: live first, sold-out ones after (greyed).
    'offers', coalesce((select jsonb_agg(public.offer_public_json(o, v_now)
                                         order by (o.quantity_reserved >= o.quantity_total),
                                                  o.pickup_start, o.id)
                        from public.offers o
                        where o.vendor_id = v.id and o.offer_kind = 'surplus'
                          and o.status in ('live', 'sold_out') and o.expires_at > v_now),
                       '[]'::jsonb),
    -- Happy hour deals: live now first, then by when they next start.
    'deals', coalesce((select jsonb_agg(public.offer_public_json(o, v_now)
                                        order by public.is_deal_live(o.id, v_now) desc,
                                                 public.deal_next_start(o.id, v_now) nulls last, o.id)
                       from public.offers o
                       where o.vendor_id = v.id and o.offer_kind = 'happy_hour' and o.status = 'live'),
                      '[]'::jsonb),
    -- Reviews (S7): the 10 newest visible ones will be listed here.
    'reviews', '[]'::jsonb,
    'server_now', v_now
  );
end;
$$;
revoke execute on function public.vendor_page(uuid) from public, anon;
grant execute on function public.vendor_page(uuid) to authenticated, service_role;
