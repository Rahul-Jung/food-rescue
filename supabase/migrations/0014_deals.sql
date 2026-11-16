-- 0014_deals (T4.6): is_deal_live() and upsert_deal. Plan section 12 calls
-- this 0013_deals. Happy hour deals (H1, BR14): visible only during their
-- hours, in Asia/Kathmandu; end before start crosses midnight; a paused deal
-- (status deactivated) is never live. No payment or commission.

-- Is this deal live at p_at? A window belongs to the day it starts on, so a
-- Friday 21:00–01:00 window is live at 00:30 on Saturday.
create function public.is_deal_live(p_offer_id uuid, p_at timestamptz default now())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with t as (
    select (p_at at time zone 'Asia/Kathmandu') as local
  ), now_parts as (
    select extract(dow from local)::int as dow, local::time as tod from t
  )
  select exists (
    select 1
    from public.offers o
    join public.vendors v on v.id = o.vendor_id and v.status = 'approved'
    join public.deal_schedules s on s.offer_id = o.id
    cross join now_parts n
    where o.id = p_offer_id
      and o.offer_kind = 'happy_hour'
      and o.status = 'live'
      and (
        -- same-day window
        (s.start_time < s.end_time and s.day_of_week = n.dow
          and n.tod >= s.start_time and n.tod < s.end_time)
        -- crossing midnight: the evening part on its own day ...
        or (s.start_time > s.end_time and s.day_of_week = n.dow and n.tod >= s.start_time)
        -- ... and the early-morning part on the next day
        or (s.start_time > s.end_time and s.day_of_week = (n.dow + 6) % 7 and n.tod < s.end_time)
      )
  );
$$;

revoke execute on function public.is_deal_live(uuid, timestamptz) from public;
grant execute on function public.is_deal_live(uuid, timestamptz) to anon, authenticated, service_role;

-- upsert_deal (V-12): creates (p_offer_id null) or edits a happy hour deal
-- and replaces its windows. At least one window; end <> start. Either a deal
-- price below the original price, or a discount %. The deal stays a draft
-- until a photo is confirmed and it is published with set_offer_status.
create function public.upsert_deal(
  p_offer_id uuid,
  p_deal jsonb,
  p_schedules jsonb,
  p_version int default null
)
returns public.offers
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.vendors%rowtype := public.caller_vendor();
  o public.offers%rowtype;
  w jsonb;
  v_day int;
  v_start time;
  v_end time;
  v_constraint text;
begin
  if v.status <> 'approved' then
    raise exception 'VENDOR_NOT_APPROVED' using errcode = '42501';
  end if;
  if p_schedules is null or jsonb_typeof(p_schedules) <> 'array' or jsonb_array_length(p_schedules) = 0 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'schedules';
  end if;
  if jsonb_array_length(p_schedules) > 21 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'schedules';
  end if;

  begin
    if p_offer_id is null then
      insert into public.offers (
        vendor_id, offer_kind, title, title_ne, description, food_type,
        original_price, price, deal_discount_pct, status
      ) values (
        v.id, 'happy_hour',
        public.jsonb_text(p_deal, 'title'),
        public.jsonb_text(p_deal, 'title_ne'),
        public.jsonb_text(p_deal, 'description'),
        (p_deal ->> 'food_type')::public.food_type,
        (p_deal ->> 'original_price')::bigint,
        (p_deal ->> 'price')::bigint,
        (p_deal ->> 'deal_discount_pct')::int,
        'draft'
      ) returning * into o;
    else
      select * into o from public.offers
       where id = p_offer_id and vendor_id = v.id and offer_kind = 'happy_hour' for update;
      if not found then
        raise exception 'FORBIDDEN' using errcode = '42501';
      end if;
      if p_version is not null and o.version <> p_version then
        raise exception 'STALE_VERSION' using errcode = '22023';
      end if;
      if o.status = 'deleted' then
        raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'status';
      end if;
      update public.offers set
        title = public.jsonb_text(p_deal, 'title'),
        title_ne = public.jsonb_text(p_deal, 'title_ne'),
        description = public.jsonb_text(p_deal, 'description'),
        food_type = (p_deal ->> 'food_type')::public.food_type,
        original_price = (p_deal ->> 'original_price')::bigint,
        price = (p_deal ->> 'price')::bigint,
        deal_discount_pct = (p_deal ->> 'deal_discount_pct')::int,
        version = version + 1
      where id = o.id returning * into o;
    end if;
  exception
    when check_violation or not_null_violation then
      get stacked diagnostics v_constraint = constraint_name;
      perform public.raise_offer_check(v_constraint);
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'number';
  end;

  delete from public.deal_schedules where offer_id = o.id;
  for w in select * from jsonb_array_elements(p_schedules) loop
    begin
      v_day := (w ->> 'day_of_week')::int;
      v_start := (w ->> 'start_time')::time;
      v_end := (w ->> 'end_time')::time;
    exception when others then
      raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'schedules';
    end;
    if v_day is null or v_day < 0 or v_day > 6 or v_start is null or v_end is null or v_start = v_end then
      raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'schedules';
    end if;
    insert into public.deal_schedules (offer_id, day_of_week, start_time, end_time)
    values (o.id, v_day, v_start, v_end);
  end loop;

  return o;
end;
$$;

revoke execute on function public.upsert_deal(uuid, jsonb, jsonb, int) from public, anon;
grant execute on function public.upsert_deal(uuid, jsonb, jsonb, int) to authenticated;
