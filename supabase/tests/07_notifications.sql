-- T3.7: notifications and push_tokens RLS, register_push_token, and the
-- vendor approved / rejected notification rows.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select on ids to authenticated;
insert into ids values
  ('shop', tests.create_user('shop@example.test', 'vendor')),
  ('other', tests.create_user('other@example.test')),
  ('admin', tests.create_user('admin@example.test', 'admin'));
with v as (
  insert into public.vendors (owner_id, name, status)
  values ((select id from ids where name = 'shop'), 'Momo Ghar', 'submitted')
  returning id
)
insert into ids select 'v', id from v;

-- register_push_token ------------------------------------------------------------
select tests.authenticate_as((select id from ids where name = 'shop'));
select throws_ok(
  $$ select public.register_push_token('not-a-token', 'android') $$,
  '22023', 'VALIDATION_FAILED', 'bad token refused'
);
select throws_ok(
  $$ select public.register_push_token('ExponentPushToken[abc]', 'web') $$,
  '22023', 'VALIDATION_FAILED', 'bad platform refused'
);
select lives_ok(
  $$ select public.register_push_token('ExponentPushToken[abc]', 'android') $$,
  'valid token registered'
);
select lives_ok(
  $$ select public.register_push_token('ExponentPushToken[abc]', 'android') $$,
  'registering again is an upsert'
);
select throws_ok($$ select 1 from public.push_tokens $$, '42501', null, 'app users cannot read push_tokens');

select tests.clear_authentication();
select is(
  (select count(*)::int from public.push_tokens where user_id = (select id from ids where name = 'shop')),
  1, 'one token row'
);

-- Same device, new user: the token moves.
select tests.authenticate_as((select id from ids where name = 'other'));
select public.register_push_token('ExponentPushToken[abc]', 'android');
select tests.clear_authentication();
select is(
  (select user_id from public.push_tokens where expo_token = 'ExponentPushToken[abc]'),
  (select id from ids where name = 'other'), 'token moves to the newest user'
);

-- Approve / reject -> notification rows ----------------------------------------------
select tests.authenticate_as_admin((select id from ids where name = 'admin'));
select public.admin_reject_vendor((select id from ids where name = 'v'), 'Blurry PAN');
select tests.clear_authentication();
select is(
  (select type || ':' || (data ->> 'reason') from public.notifications where user_id = (select id from ids where name = 'shop')),
  'vendor_rejected:Blurry PAN', 'rejection creates a notification with the reason'
);

update public.vendors set status = 'submitted' where id = (select id from ids where name = 'v');
select tests.authenticate_as_admin((select id from ids where name = 'admin'));
select public.admin_approve_vendor((select id from ids where name = 'v'));
select tests.clear_authentication();
select is(
  (select count(*)::int from public.notifications
    where user_id = (select id from ids where name = 'shop') and type = 'vendor_approved'
      and title_key = 'notif.vendor_approved.title'),
  1, 'approval creates a vendor_approved notification'
);

-- Inbox RLS ----------------------------------------------------------------------------
select tests.authenticate_as((select id from ids where name = 'shop'));
select is((select count(*)::int from public.notifications), 2, 'vendor sees own notifications');
select lives_ok(
  $$ update public.notifications set read_at = now() where type = 'vendor_approved' $$,
  'vendor can mark own notification read'
);
select throws_ok(
  $$ update public.notifications set body_key = 'x' $$,
  '42501', null, 'vendor cannot change other fields'
);
select tests.clear_authentication();
select tests.authenticate_as((select id from ids where name = 'other'));
select is_empty($$ select 1 from public.notifications $$, 'another user sees none of them');
select throws_ok(
  $$ insert into public.notifications (user_id, type, title_key, body_key) values ((select id from ids where name = 'other'), 'x', 'a', 'b') $$,
  '42501', null, 'app users cannot create notifications'
);

select * from finish();
rollback;
