-- 0012_offers (T4.1): offers, offer_images, deal_schedules, waitlist,
-- location-copy trigger, search_tsv, RLS. Plan section 5 calls this
-- 0005_offers; 0005–0011 were already used, so it takes the next number.
-- is_deal_live() comes with T4.6 (0014_deals).
--
-- V1 rules held by the database (the RPCs add the time-based ones):
--   surplus: name, food type, prices (0 < price < original), quantity >= 1,
--            pickup end after start, expiry <= pickup end
--   happy hour: no pickup / expiry / quantity; a deal price below the
--            original, or a discount % (H1: "discount or deal price")
-- Offer states (section 4): draft, live, sold_out, expired, deactivated, deleted.

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  offer_kind public.offer_kind not null default 'surplus',
  title text not null check (char_length(btrim(title)) between 2 and 120),
  title_ne text check (char_length(title_ne) <= 120),
  description text check (char_length(description) <= 1000),
  ingredients text check (char_length(ingredients) <= 1000),
  food_type public.food_type,
  weight_g int check (weight_g is null or weight_g between 1 and 100000),
  original_price bigint check (original_price is null or original_price > 0),
  price bigint check (price is null or price > 0),
  -- Happy hour "x% off" deals have no price; surplus offers never use this.
  deal_discount_pct int check (deal_discount_pct is null or deal_discount_pct between 1 and 90),
  discount_pct int generated always as (
    coalesce(
      deal_discount_pct,
      case when original_price > 0 and price is not null
           then round(100 - price * 100.0 / original_price)::int end
    )
  ) stored,
  quantity_total int,
  quantity_reserved int not null default 0,
  pickup_start timestamptz,
  pickup_end timestamptz,
  expires_at timestamptz,
  status public.offer_status not null default 'draft',
  version int not null default 1,
  location extensions.geography(Point, 4326),
  search_tsv tsvector generated always as (
    to_tsvector('simple',
      coalesce(title, '') || ' ' || coalesce(title_ne, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint offers_price_below_original
    check (price is null or original_price is null or price < original_price),
  constraint offers_quantity_bounds
    check (quantity_reserved >= 0 and (quantity_total is null or quantity_reserved <= quantity_total)),
  constraint offers_pickup_order
    check (pickup_start is null or pickup_end is null or pickup_end > pickup_start),
  constraint offers_expiry_before_pickup_end
    check (expires_at is null or pickup_end is null or expires_at <= pickup_end),
  constraint offers_surplus_fields check (
    offer_kind <> 'surplus' or (
      food_type is not null
      and original_price is not null and price is not null
      and deal_discount_pct is null
      and quantity_total is not null and quantity_total >= 1
      and pickup_start is not null and pickup_end is not null and expires_at is not null
    )
  ),
  constraint offers_happy_hour_fields check (
    offer_kind <> 'happy_hour' or (
      pickup_start is null and pickup_end is null and expires_at is null
      and quantity_total is null and quantity_reserved = 0
      and (
        (deal_discount_pct is not null and price is null)
        or (deal_discount_pct is null and price is not null and original_price is not null)
      )
    )
  )
);

create index offers_location_gist on public.offers using gist (location);
create index offers_status_expires_idx on public.offers (status, expires_at);
create index offers_search_gin on public.offers using gin (search_tsv);
create index offers_vendor_idx on public.offers (vendor_id, created_at desc);

create table public.offer_images (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  path text not null,
  position smallint not null check (position between 0 and 4),
  created_at timestamptz not null default now(),
  unique (offer_id, position)
);

-- deal_schedules: happy hour only. end < start crosses midnight; end <> start.
create table public.deal_schedules (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint deal_schedules_not_empty check (end_time <> start_time)
);
create index deal_schedules_offer_idx on public.deal_schedules (offer_id);

-- waitlist (C-? / T5.x): people outside the pilot area.
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  contact text not null check (char_length(contact) between 3 and 254),
  area text check (char_length(area) <= 120),
  point extensions.geography(Point, 4326),
  created_at timestamptz not null default now()
);

-- Triggers ------------------------------------------------------------------
-- Max 5 images per offer (section 5).
create function public.offer_images_max_five()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.offer_images where offer_id = new.offer_id) >= 5 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'images';
  end if;
  return new;
end;
$$;

create trigger offer_images_max_five
  before insert on public.offer_images
  for each row execute function public.offer_images_max_five();

-- Happy hour schedules only on happy hour offers.
create function public.deal_schedules_kind_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select offer_kind from public.offers where id = new.offer_id) is distinct from 'happy_hour' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'offer_kind';
  end if;
  return new;
end;
$$;

create trigger deal_schedules_kind_check
  before insert or update on public.deal_schedules
  for each row execute function public.deal_schedules_kind_check();

-- Location copy: an offer always sits at its vendor's pin.
create function public.offers_copy_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select v.location into new.location from public.vendors v where v.id = new.vendor_id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger offers_copy_location
  before insert or update on public.offers
  for each row execute function public.offers_copy_location();

-- When the vendor moves their pin (V-21), their offers move too.
create function public.vendors_move_offers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.location is distinct from old.location then
    update public.offers set location = new.location where vendor_id = new.id;
  end if;
  return new;
end;
$$;

create trigger vendors_move_offers
  after update of location on public.vendors
  for each row execute function public.vendors_move_offers();

revoke execute on function public.offer_images_max_five() from public, anon, authenticated;
revoke execute on function public.deal_schedules_kind_check() from public, anon, authenticated;
revoke execute on function public.offers_copy_location() from public, anon, authenticated;
revoke execute on function public.vendors_move_offers() from public, anon, authenticated;

-- RLS (section 8): customers read live rows of approved vendors; vendors read
-- their own; writes only through RPCs (0013, 0014); admin (aal2) all.
alter table public.offers enable row level security;
alter table public.offer_images enable row level security;
alter table public.deal_schedules enable row level security;
alter table public.waitlist enable row level security;

revoke all on public.offers, public.offer_images, public.deal_schedules, public.waitlist
  from anon, authenticated;
grant select, insert, update, delete on public.offers, public.offer_images, public.deal_schedules
  to authenticated; -- admin "All"; the policies below allow writes to admin only
grant select on public.waitlist to authenticated;

create function public.offer_visible_to_customers(p_offer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.offers o join public.vendors v on v.id = o.vendor_id
    where o.id = p_offer_id and o.status = 'live' and v.status = 'approved'
  );
$$;
revoke execute on function public.offer_visible_to_customers(uuid) from public, anon;
grant execute on function public.offer_visible_to_customers(uuid) to authenticated, service_role;

create policy "offers: read live of approved vendors"
  on public.offers for select to authenticated
  using (
    status = 'live'
    and (select public.jwt_is_active())
    and public.vendor_is_approved(vendor_id)
  );
create policy "offers: vendor reads own"
  on public.offers for select to authenticated
  using (public.jwt_owns_vendor(vendor_id));
create policy "offers: admin all"
  on public.offers for all to authenticated
  using ((select public.jwt_is_admin())) with check ((select public.jwt_is_admin()));

create policy "offer_images: read with a visible offer"
  on public.offer_images for select to authenticated
  using ((select public.jwt_is_active()) and public.offer_visible_to_customers(offer_id));
create policy "offer_images: vendor reads own"
  on public.offer_images for select to authenticated
  using (public.jwt_owns_vendor((select o.vendor_id from public.offers o where o.id = offer_id)));
create policy "offer_images: admin all"
  on public.offer_images for all to authenticated
  using ((select public.jwt_is_admin())) with check ((select public.jwt_is_admin()));

create policy "deal_schedules: read with a visible offer"
  on public.deal_schedules for select to authenticated
  using ((select public.jwt_is_active()) and public.offer_visible_to_customers(offer_id));
create policy "deal_schedules: vendor reads own"
  on public.deal_schedules for select to authenticated
  using (public.jwt_owns_vendor((select o.vendor_id from public.offers o where o.id = offer_id)));
create policy "deal_schedules: admin all"
  on public.deal_schedules for all to authenticated
  using ((select public.jwt_is_admin())) with check ((select public.jwt_is_admin()));

-- waitlist: written by its RPC (S5); only admins read it.
create policy "waitlist: admin reads"
  on public.waitlist for select to authenticated
  using ((select public.jwt_is_admin()));
