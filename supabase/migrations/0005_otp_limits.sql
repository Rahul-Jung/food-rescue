-- 0005_otp_limits (T2.3): per-phone OTP send limit used by the sms-hook Edge
-- Function. Plan: resend after 30 s (Auth max_frequency), 3 per 15 min.
-- Supabase Auth's own sms_sent limit is per project per hour, so the
-- per-phone window lives here.

insert into public.app_settings (key, value, is_public) values
  ('otp_max_sends', '3', false),
  ('otp_send_window_minutes', '15', false)
on conflict (key) do nothing;

create table public.otp_sends (
  id bigserial primary key,
  phone text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index otp_sends_phone_sent_at_idx on public.otp_sends (phone, sent_at desc);

alter table public.otp_sends enable row level security;
revoke all on public.otp_sends from anon, authenticated;

-- Records a send and returns true, or returns false (and records nothing) when
-- the phone already had otp_max_sends sends in the last otp_send_window_minutes.
-- Called only by the sms-hook function with the service role.
create function public.otp_send_allowed(p_phone text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max int := (public.app_setting('otp_max_sends'))::int;
  v_window interval := make_interval(mins => (public.app_setting('otp_send_window_minutes'))::int);
  v_count int;
begin
  if p_phone is null or p_phone !~ '^\+9779[78][0-9]{8}$' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  -- Serialise sends for the same phone so parallel requests can't slip past the limit.
  perform pg_advisory_xact_lock(hashtextextended('otp:' || p_phone, 0));

  select count(*) into v_count
  from public.otp_sends
  where phone = p_phone and sent_at > now() - v_window;

  if v_count >= v_max then
    return false;
  end if;

  insert into public.otp_sends (phone) values (p_phone);
  -- Keep the table small: rows older than a day are never needed.
  delete from public.otp_sends where sent_at < now() - interval '1 day';
  return true;
end;
$$;

revoke execute on function public.otp_send_allowed(text) from public, anon, authenticated;
grant execute on function public.otp_send_allowed(text) to service_role;
