begin;
create extension if not exists pgtap with schema extensions;
select plan(9);
delete from public.otp_sends where phone in ('+9779812345678', '+9779800000001');

select is(public.app_setting('otp_max_sends'), '3'::jsonb, 'otp_max_sends defaults to 3');
select is(public.app_setting('otp_send_window_minutes'), '15'::jsonb, 'window defaults to 15 minutes');

select ok(public.otp_send_allowed('+9779812345678'), '1st send allowed');
select ok(public.otp_send_allowed('+9779812345678'), '2nd send allowed');
select ok(public.otp_send_allowed('+9779812345678'), '3rd send allowed');
select ok(not public.otp_send_allowed('+9779812345678'), '4th send in 15 minutes refused');
select ok(public.otp_send_allowed('+9779800000001'), 'other phones are not affected');

-- Sends older than the window no longer count
update public.otp_sends set sent_at = now() - interval '16 minutes' where phone = '+9779812345678';
select ok(public.otp_send_allowed('+9779812345678'), 'allowed again after 15 minutes');

-- Only the service role (the sms-hook function) may call it
set local role authenticated;
select throws_ok(
  $$ select public.otp_send_allowed('+9779812345678') $$,
  '42501', null,
  'app users cannot call otp_send_allowed'
);
reset role;

select * from finish();
rollback;
