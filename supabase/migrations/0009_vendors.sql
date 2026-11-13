-- 0009_vendors: vendors, vendor_hours, vendors_public, storage buckets (T3.1).
-- Plan section 5 calls this 0004_vendors; 0004–0008 were already used by S2,
-- so it takes the next free number.
--   vendors:      customer sees approved vendors through vendors_public only;
--                 owner reads / updates own row, but status, commission and
--                 strikes are read-only; admin (aal2) all.
--   vendor_hours: read for approved vendors; full on own; admin all.
--   Storage:      public-images (public, written only through upload-sign with
--                 the service role); private-docs (pan/{vendor_id}/{file},
--                 owner writes, owner and admin read).

-- Tables ---------------------------------------------------------------------
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete restrict,
  name text not null default '' check (char_length(name) <= 120),
  type public.vendor_type not null default 'restaurant',
  description text check (char_length(description) <= 2000),
  logo_url text,
  phone text,
  email text,
  address text,
  landmark text,
  area text,
  location extensions.geography(Point, 4326),
  pan_vat_no text,
  pan_doc_path text,
  status public.vendor_status not null default 'draft',
  reject_reason text,
  pending_review boolean not null default false,
  commission_rate_bp int not null default 1200 check (commission_rate_bp between 0 and 5000),
  commission_free_until timestamptz,
  strikes_30d int not null default 0 check (strikes_30d >= 0),
  payout_method public.payout_method,
  payout_account jsonb,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vendors_location_gist on public.vendors using gist (location);
create unique index vendors_pan_vat_no_key on public.vendors (pan_vat_no) where pan_vat_no is not null;
create index vendors_status_idx on public.vendors (status);

create table public.vendor_hours (
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens time not null,
  closes time not null,
  primary key (vendor_id, day_of_week)
);

-- Helpers (SECURITY DEFINER so policies on one table can look at vendors
-- without the caller's own vendors policies hiding the row) -------------------
create function public.jwt_owns_vendor(p_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.jwt_is_active() and exists (
    select 1 from public.vendors v
    where v.id = p_vendor_id and v.owner_id = auth.uid()
  );
$$;

create function public.vendor_is_approved(p_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vendors v
    where v.id = p_vendor_id and v.status = 'approved'
  );
$$;

revoke execute on function public.jwt_owns_vendor(uuid) from public, anon;
revoke execute on function public.vendor_is_approved(uuid) from public, anon;
grant execute on function public.jwt_owns_vendor(uuid) to authenticated, service_role;
grant execute on function public.vendor_is_approved(uuid) to authenticated, service_role;

-- vendors RLS ----------------------------------------------------------------
alter table public.vendors enable row level security;
revoke all on public.vendors from anon, authenticated;
grant select, insert, update, delete on public.vendors to authenticated;

create policy "vendors: owner reads own row"
  on public.vendors for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.jwt_is_active()));

-- V-01 (T3.3) creates the draft row; the guard below keeps it a plain draft.
create policy "vendors: owner creates own draft"
  on public.vendors for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.jwt_is_active()));

create policy "vendors: owner updates own row"
  on public.vendors for update to authenticated
  using (owner_id = (select auth.uid()) and (select public.jwt_is_active()))
  with check (owner_id = (select auth.uid()) and (select public.jwt_is_active()));

create policy "vendors: admin all"
  on public.vendors for all to authenticated
  using ((select public.jwt_is_admin()))
  with check ((select public.jwt_is_admin()));

-- Column guard: owners cannot set status, commission, strikes or approval
-- fields. Those change only through admin (aal2) or SECURITY DEFINER RPCs.
create function public.vendors_guard_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.jwt_is_admin() then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft'
       or new.commission_rate_bp <> 1200
       or new.commission_free_until is not null
       or new.strikes_30d <> 0
       or new.approved_at is not null
       or new.reject_reason is not null
       or new.pending_review then
      raise exception 'FORBIDDEN' using errcode = '42501',
        detail = 'a new vendor starts as a plain draft';
    end if;
    return new;
  end if;
  if new.id is distinct from old.id
     or new.owner_id is distinct from old.owner_id
     or new.status is distinct from old.status
     or new.reject_reason is distinct from old.reject_reason
     or new.pending_review is distinct from old.pending_review
     or new.commission_rate_bp is distinct from old.commission_rate_bp
     or new.commission_free_until is distinct from old.commission_free_until
     or new.strikes_30d is distinct from old.strikes_30d
     or new.approved_at is distinct from old.approved_at
     or new.created_at is distinct from old.created_at then
    raise exception 'FORBIDDEN' using errcode = '42501',
      detail = 'status, commission, strikes and approval fields are read-only';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger vendors_guard_columns
  before insert or update on public.vendors
  for each row execute function public.vendors_guard_columns();

-- Owners never delete a vendor row (no owner delete policy); admin may.

-- vendors_public: what customers see. Runs as the view owner so customers get
-- only these columns of approved vendors, never PAN, payout or commission.
-- rating_avg / rating_count join in from vendor_stats when reviews land (S7).
create view public.vendors_public
with (security_barrier = true)
as
select v.id, v.name, v.type, v.logo_url, v.description, v.area, v.landmark,
       v.location, v.phone
from public.vendors v
where v.status = 'approved'
  and public.jwt_is_active();

revoke all on public.vendors_public from anon, authenticated;
grant select on public.vendors_public to authenticated;

-- vendor_hours RLS -----------------------------------------------------------
alter table public.vendor_hours enable row level security;
revoke all on public.vendor_hours from anon, authenticated;
grant select, insert, update, delete on public.vendor_hours to authenticated;

create policy "vendor_hours: read for approved vendors"
  on public.vendor_hours for select to authenticated
  using ((select public.jwt_is_active()) and public.vendor_is_approved(vendor_id));

create policy "vendor_hours: owner full on own"
  on public.vendor_hours for all to authenticated
  using (public.jwt_owns_vendor(vendor_id))
  with check (public.jwt_owns_vendor(vendor_id));

create policy "vendor_hours: admin all"
  on public.vendor_hours for all to authenticated
  using ((select public.jwt_is_admin()))
  with check ((select public.jwt_is_admin()));

-- Storage --------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-images', 'public-images', true, 1048576,
   array['image/webp', 'image/jpeg', 'image/png']),
  ('private-docs', 'private-docs', false, 5242880,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- public-images: no policies for app users on purpose. Reads go through the
-- public CDN URL; writes go only through upload-sign (service role, T3.2).

-- private-docs: pan/{vendor_id}/{file}. Owner writes and reads; admin reads
-- (5-minute signed URLs are made by the admin panel / functions).
create function public.jwt_owns_pan_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[] := storage.foldername(p_name);
begin
  if coalesce(array_length(v_parts, 1), 0) <> 2 or v_parts[1] <> 'pan' then
    return false;
  end if;
  return public.jwt_is_active() and exists (
    select 1 from public.vendors v
    where v.id::text = v_parts[2] and v.owner_id = auth.uid()
  );
end;
$$;

revoke execute on function public.jwt_owns_pan_path(text) from public, anon;
grant execute on function public.jwt_owns_pan_path(text) to authenticated, service_role;

create policy "private-docs: owner reads own pan"
  on storage.objects for select to authenticated
  using (bucket_id = 'private-docs' and public.jwt_owns_pan_path(name));

create policy "private-docs: owner uploads own pan"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'private-docs' and public.jwt_owns_pan_path(name));

create policy "private-docs: owner replaces own pan"
  on storage.objects for update to authenticated
  using (bucket_id = 'private-docs' and public.jwt_owns_pan_path(name))
  with check (bucket_id = 'private-docs' and public.jwt_owns_pan_path(name));

create policy "private-docs: owner deletes own pan"
  on storage.objects for delete to authenticated
  using (bucket_id = 'private-docs' and public.jwt_owns_pan_path(name));

create policy "private-docs: admin reads all"
  on storage.objects for select to authenticated
  using (bucket_id = 'private-docs' and (select public.jwt_is_admin()));
