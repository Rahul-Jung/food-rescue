-- 0011_notifications: notification plumbing (T3.7, plan section 9).
-- Every notice is a row in notifications. A database webhook (pg_net trigger)
-- calls the send-push Edge Function, which sends the push in the receiver's
-- language and, for vendor approval / rejection, an email through Resend.
-- The inbox screens (C-22, V-20, S7) read the same rows.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (char_length(type) between 1 and 64),
  title_key text not null,
  body_key text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_token text not null unique check (expo_token ~ '^Expo(nent)?PushToken\[.+\]$'),
  platform text not null check (platform in ('android', 'ios')),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

-- RLS: users read their own notifications and may only set read_at.
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "notifications: read own"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) and (select public.jwt_is_active()));

create policy "notifications: mark own read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()) and (select public.jwt_is_active()))
  with check (user_id = (select auth.uid()) and (select public.jwt_is_active()));

create policy "notifications: admin reads all"
  on public.notifications for select to authenticated
  using ((select public.jwt_is_admin()));

-- push_tokens: no direct access; register_push_token only. send-push uses
-- the service role (and deletes tokens Expo reports as dead).
alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;

-- register_push_token (section 6): upsert, update last_seen. A token moves to
-- the newest signed-in user of that device.
create function public.register_push_token(p_expo_token text, p_platform text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if not public.jwt_is_active() then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  if p_expo_token is null or p_expo_token !~ '^Expo(nent)?PushToken\[.+\]$' or char_length(p_expo_token) > 200 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'expo_token';
  end if;
  if p_platform is null or p_platform not in ('android', 'ios') then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'platform';
  end if;

  insert into public.push_tokens (user_id, expo_token, platform, last_seen)
  values (v_uid, p_expo_token, p_platform, now())
  on conflict (expo_token) do update
    set user_id = excluded.user_id, platform = excluded.platform, last_seen = now();
end;
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- Vendor approved / rejected -> notification (Push + email, section 9).
create function public.vendors_notify_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if new.status = 'approved' then
    insert into public.notifications (user_id, type, title_key, body_key, data)
    values (new.owner_id, 'vendor_approved', 'notif.vendor_approved.title',
            'notif.vendor_approved.body', jsonb_build_object('vendor_id', new.id));
  elsif new.status = 'rejected' then
    insert into public.notifications (user_id, type, title_key, body_key, data)
    values (new.owner_id, 'vendor_rejected', 'notif.vendor_rejected.title',
            'notif.vendor_rejected.body',
            jsonb_build_object('vendor_id', new.id, 'reason', new.reject_reason));
  end if;
  return new;
end;
$$;

revoke execute on function public.vendors_notify_status() from public, anon, authenticated;

create trigger vendors_notify_status
  after update of status on public.vendors
  for each row execute function public.vendors_notify_status();

-- Database webhook: on insert, POST { notification_id } to send-push.
-- The URL and shared secret live in Supabase Vault (names send_push_url and
-- send_push_secret), set per environment. Without them nothing is sent, and
-- the row still reaches the inbox.
create function public.notifications_call_send_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'send_push_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'send_push_secret';
  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
    return new;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke execute on function public.notifications_call_send_push() from public, anon, authenticated;

create trigger notifications_call_send_push
  after insert on public.notifications
  for each row execute function public.notifications_call_send_push();
