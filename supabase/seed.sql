-- Local and staging seed data. app_settings defaults are seeded by
-- migration 0002 so production gets them too. Admin, vendors, offers and
-- customers are added by later tasks.

-- Pilot areas for C-05 "Denied = pick a pilot area from the list" (plan
-- section 9: Thamel, Baneshwor, Jawalakhel, Patan, Pulchowk, Kupondole and
-- others). Approximate centre points; the pilot seed task refines them.
update public.app_settings
set value = '[
  {"name": "Thamel", "name_ne": "ठमेल", "lat": 27.7154, "lng": 85.3123},
  {"name": "Baneshwor", "name_ne": "बानेश्वर", "lat": 27.6889, "lng": 85.3360},
  {"name": "Jawalakhel", "name_ne": "जावलाखेल", "lat": 27.6730, "lng": 85.3140},
  {"name": "Patan", "name_ne": "पाटन", "lat": 27.6727, "lng": 85.3253},
  {"name": "Pulchowk", "name_ne": "पुल्चोक", "lat": 27.6782, "lng": 85.3186},
  {"name": "Kupondole", "name_ne": "कुपण्डोल", "lat": 27.6880, "lng": 85.3170},
  {"name": "Lazimpat", "name_ne": "लाजिम्पाट", "lat": 27.7215, "lng": 85.3197},
  {"name": "New Road", "name_ne": "न्युरोड", "lat": 27.7041, "lng": 85.3093}
]'::jsonb
where key = 'pilot_areas';

-- T2.7 test logins (local only; phone OTP, the code shows in the sms-hook log):
--   +9779800000001  vendor             -> lands on vendor home
--   +9779800000002  suspended customer -> sees the blocked screen
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-0000-0000-0000000a0001'::uuid, '9779800000001', 'vendor'::public.app_role, 'active'::public.account_status, 'Test Vendor'),
      ('00000000-0000-0000-0000-0000000a0002'::uuid, '9779800000002', 'customer'::public.app_role, 'suspended'::public.account_status, 'Suspended Customer')
    ) as t(id, phone, role, status, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, phone, phone_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      -- Auth reads these as strings; NULL breaks login
      confirmation_token, recovery_token, email_change_token_new, email_change,
      phone_change, phone_change_token, email_change_token_current, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.phone, now(),
      '{"provider": "phone", "providers": ["phone"]}', jsonb_build_object('full_name', u.full_name),
      now(), now(), '', '', '', '', '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      u.id::text, u.id,
      jsonb_build_object('sub', u.id::text, 'phone', u.phone, 'phone_verified', true),
      'phone', now(), now(), now()
    ) on conflict do nothing;

    update public.profiles set role = u.role, status = u.status where id = u.id;
  end loop;
end $$;
