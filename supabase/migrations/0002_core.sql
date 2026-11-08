-- 0002_core: enums, app_settings (seeded), audit_log, now_npt(), app_setting(key).

-- Enums ---------------------------------------------------------------------
create type public.app_role as enum ('customer', 'vendor', 'admin');
create type public.account_status as enum ('active', 'suspended', 'deleted');
create type public.vendor_type as enum ('restaurant', 'grocery', 'bakery', 'cafe', 'hotel', 'other');
create type public.vendor_status as enum ('draft', 'submitted', 'approved', 'rejected', 'suspended');
create type public.offer_kind as enum ('surplus', 'happy_hour');
create type public.food_type as enum ('veg', 'non_veg', 'vegan');
create type public.offer_status as enum ('draft', 'live', 'sold_out', 'expired', 'deactivated', 'deleted');
create type public.order_status as enum (
  'pending_payment', 'paid', 'collected', 'no_show',
  'cancelled_by_customer', 'cancelled_by_vendor', 'refunded', 'expired_hold'
);
create type public.pay_provider as enum ('esewa', 'khalti');
create type public.payment_status as enum ('initiated', 'verified', 'failed', 'refunded', 'partially_refunded');
create type public.refund_status as enum ('requested', 'done', 'failed');
create type public.ledger_type as enum ('sale', 'commission', 'refund', 'payout', 'adjustment');
create type public.ledger_bucket as enum ('pending', 'available', 'paid_out');
create type public.withdrawal_status as enum ('requested', 'approved', 'rejected', 'paid');
create type public.payout_method as enum ('bank', 'esewa', 'khalti');

-- app_settings ----------------------------------------------------------------
-- Every business-rule value lives here (plan section 4). Writes only through
-- admin_update_setting (later task). updated_by gets its FK to profiles in 0003.
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

insert into public.app_settings (key, value, is_public) values
  -- Business rules BR1-BR13
  ('hold_minutes',             '10',    true),
  ('pickup_grace_minutes',     '15',    true),
  ('cancel_window_minutes',    '60',    true),
  ('strike_limit',             '3',     false),
  ('strike_days',              '30',    false),
  ('refund_days',              '7',     true),
  ('default_commission_bp',    '1200',  true),
  ('free_days',                '30',    true),
  ('min_withdrawal_paisa',     '50000', true),
  ('payout_working_days',      '3',     true),
  ('review_days',              '7',     true),
  -- Other limits
  ('max_order_qty_per_order',  '5',     true),
  ('order_rate_per_minute',    '5',     false),
  ('pickup_code_tries',        '10',    false),
  ('pickup_code_lock_minutes', '5',     false),
  ('otp_resend_seconds',       '30',    true),
  ('radius_options_m',         '[2000, 3000]', true),
  -- Rough Kathmandu + Lalitpur box; the pilot seed task replaces it with the real boundary.
  ('pilot_polygon', '{"type":"Polygon","coordinates":[[[85.25,27.62],[85.40,27.62],[85.40,27.76],[85.25,27.76],[85.25,27.62]]]}', true),
  ('pilot_areas',              '[]',    true),
  ('min_app_version',          '"0.0.0"', true),
  ('maintenance',              'false', true),
  -- Feature flags: all off until each path is built and live.
  ('payments_enabled',         'false', true),
  ('esewa_enabled',            'false', true),
  ('khalti_enabled',           'false', true),
  ('pay_at_pickup_enabled',    'false', true);

-- Non-secret settings readable by the apps.
create view public.app_settings_public as
  select key, value from public.app_settings where is_public;

grant select on public.app_settings_public to anon, authenticated;

-- audit_log -------------------------------------------------------------------
-- Insert-only (BR12): nobody, including admin, may update or delete rows.
create table public.audit_log (
  id bigserial primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity, entity_id, at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
revoke update, delete, truncate on public.audit_log from service_role;

create function public.audit_log_block_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is insert-only' using errcode = '42501';
end;
$$;

create trigger audit_log_no_update_delete
  before update or delete on public.audit_log
  for each row execute function public.audit_log_block_change();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public.audit_log_block_change();

-- Helpers ---------------------------------------------------------------------
-- Current wall-clock time in Nepal (UTC+05:45), for day/hour rules.
create function public.now_npt()
returns timestamp
language sql
stable
set search_path = ''
as $$
  select now() at time zone 'Asia/Kathmandu';
$$;

-- Read one setting; raises if the key is missing so code never silently
-- falls back to a hard-coded number. Internal: used by RPCs, not the apps.
create function public.app_setting(p_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  select s.value into v from public.app_settings s where s.key = p_key;
  if not found then
    raise exception 'unknown app_setting: %', p_key using errcode = 'P0002';
  end if;
  return v;
end;
$$;

revoke execute on function public.app_setting(text) from public, anon, authenticated;
grant execute on function public.app_setting(text) to service_role;
grant execute on function public.now_npt() to anon, authenticated, service_role;
