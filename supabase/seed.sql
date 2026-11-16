-- Local and staging seed data. app_settings defaults are seeded by
-- migration 0002 so production gets them too. Admin, vendors, offers and
-- customers are added by later tasks (T5.1: vendors, offers, deals below).

-- T5.1 pilot boundary and areas (plan section 9). Same values as
-- seed/pilot-areas.json; keep the two in sync. C-05 / T5.3 "pick a pilot
-- area" uses the centre points; outside the polygon the app shows the waitlist.
update public.app_settings set value = '{"type":"Polygon","coordinates":[[[85.282,27.748],[85.31,27.756],[85.345,27.75],[85.37,27.728],[85.365,27.695],[85.35,27.67],[85.34,27.645],[85.315,27.64],[85.29,27.655],[85.285,27.685],[85.27,27.71],[85.282,27.748]]]}'::jsonb
where key = 'pilot_polygon';

update public.app_settings
set value = '[
  {
    "name": "Thamel",
    "name_ne": "ठमेल",
    "lat": 27.7154,
    "lng": 85.3123
  },
  {
    "name": "Lazimpat",
    "name_ne": "लाजिम्पाट",
    "lat": 27.7215,
    "lng": 85.3197
  },
  {
    "name": "New Road",
    "name_ne": "न्युरोड",
    "lat": 27.7041,
    "lng": 85.3093
  },
  {
    "name": "Maharajgunj",
    "name_ne": "महाराजगन्ज",
    "lat": 27.736,
    "lng": 85.3305
  },
  {
    "name": "Baneshwor",
    "name_ne": "बानेश्वर",
    "lat": 27.6889,
    "lng": 85.336
  },
  {
    "name": "Koteshwor",
    "name_ne": "कोटेश्वर",
    "lat": 27.679,
    "lng": 85.349
  },
  {
    "name": "Kupondole",
    "name_ne": "कुपण्डोल",
    "lat": 27.688,
    "lng": 85.317
  },
  {
    "name": "Pulchowk",
    "name_ne": "पुल्चोक",
    "lat": 27.6782,
    "lng": 85.3186
  },
  {
    "name": "Sanepa",
    "name_ne": "सानेपा",
    "lat": 27.6845,
    "lng": 85.3065
  },
  {
    "name": "Jawalakhel",
    "name_ne": "जावलाखेल",
    "lat": 27.673,
    "lng": 85.314
  },
  {
    "name": "Patan",
    "name_ne": "पाटन",
    "lat": 27.6727,
    "lng": 85.3253
  },
  {
    "name": "Satdobato",
    "name_ne": "सातदोबाटो",
    "lat": 27.659,
    "lng": 85.325
  }
]'::jsonb
where key = 'pilot_areas';

-- T2.8 local admin (admin panel, email + password, then TOTP enrolment).
-- Admin accounts are created only by SQL seed or another admin (plan section 8).
--   admin@foodrescue.local / LocalAdmin2026  (local only, never staging / production)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, email_change_token_current, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000ad001',
  'authenticated', 'authenticated', 'admin@foodrescue.local',
  extensions.crypt('LocalAdmin2026', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', '{"full_name": "Local Admin"}', now(), now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  '00000000-0000-0000-0000-0000000ad001', '00000000-0000-0000-0000-0000000ad001',
  '{"sub": "00000000-0000-0000-0000-0000000ad001", "email": "admin@foodrescue.local", "email_verified": true}',
  'email', now(), now(), now()
) on conflict do nothing;

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000ad001';

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

-- T3.7 local only: the notifications webhook calls the local send-push
-- function. Put the same secret in supabase/functions/.env as
-- SEND_PUSH_WEBHOOK_SECRET. Staging and production set their own in Vault.
select vault.create_secret('http://host.docker.internal:54321/functions/v1/send-push', 'send_push_url');
select vault.create_secret('local-send-push-secret', 'send_push_secret');

-- T5.1 discovery seed (local and staging): 30 approved vendors around
-- Jawalakhel / Patan and Thamel / New Road, each with 4 surplus offers and
-- 1 happy hour deal = 150 offers. Times are relative to the reset, so surplus
-- offers stay live for a few hours after `supabase db reset`.
-- Vendor owners log in with phone OTP +9779800010101 … +9779800010130
-- (code in the sms-hook log).
do $$
declare
  v record;
  i int := 0;
  item record;
  o_id uuid;
  start_at timestamptz;
  hours int;
  hub_lat float8;
  hub_lng float8;
  owner uuid;
  vid uuid;
begin
  perform setseed(0.42);
  for v in
    select * from (values
      ('Jawalakhel Momo Ghar', 'restaurant'), ('Patan Bakery Cafe', 'bakery'),
      ('Pulchowk Kitchen', 'restaurant'), ('Kupondole Bread House', 'bakery'),
      ('Lagankhel Bhojanalaya', 'restaurant'), ('Sanepa Green Grocer', 'grocery'),
      ('Mangal Bazaar Sweets', 'bakery'), ('Ekantakuna Cafe', 'cafe'),
      ('Patan Durbar Khaja Ghar', 'restaurant'), ('Jhamsikhel Bistro', 'cafe'),
      ('Bakhundol Thakali', 'restaurant'), ('Lalitpur Fresh Mart', 'grocery'),
      ('Hotel Jawalakhel View', 'hotel'), ('Kumaripati Newari Kitchen', 'restaurant'),
      ('Satdobato Pastry Shop', 'bakery'),
      ('Thamel Momo Hub', 'restaurant'), ('Thamel German Bakery', 'bakery'),
      ('Chhetrapati Dal Bhat', 'restaurant'), ('Lazimpat Coffee Roasters', 'cafe'),
      ('Paknajol Pizza', 'restaurant'), ('Jyatha Thakali Bhansa', 'restaurant'),
      ('Asan Fresh Veg', 'grocery'), ('New Road Mithai Pasal', 'bakery'),
      ('Kathmandu Guest Kitchen', 'hotel'), ('Durbarmarg Cafe', 'cafe'),
      ('Bhagwan Bahal Bakery', 'bakery'), ('Thamel Newa Lahana', 'restaurant'),
      ('Sorhakhutte Grocery', 'grocery'), ('Kantipath Kitchen', 'restaurant'),
      ('Naxal Tea House', 'cafe')
    ) as t(name, type)
  loop
    i := i + 1;
    owner := ('00000000-0000-0000-0000-0000000b' || lpad(i::text, 4, '0'))::uuid;
    vid := ('00000000-0000-0000-0000-0000000c' || lpad(i::text, 4, '0'))::uuid;
    -- first 15 around Jawalakhel, next 15 around Thamel (within about 1.5 km)
    if i <= 15 then hub_lat := 27.6730; hub_lng := 85.3140;
    else hub_lat := 27.7154; hub_lng := 85.3123; end if;

    insert into auth.users (
      instance_id, id, aud, role, phone, phone_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      phone_change, phone_change_token, email_change_token_current, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', owner, 'authenticated', 'authenticated',
      '97798000101' || lpad(i::text, 2, '0'), now(),
      '{"provider": "phone", "providers": ["phone"]}',
      jsonb_build_object('full_name', v.name || ' owner'),
      now(), now(), '', '', '', '', '', '', '', ''
    ) on conflict (id) do nothing;
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      owner::text, owner,
      jsonb_build_object('sub', owner::text, 'phone', '97798000101' || lpad(i::text, 2, '0'),
        'phone_verified', true),
      'phone', now(), now(), now()
    ) on conflict do nothing;
    update public.profiles set role = 'vendor' where id = owner;

    insert into public.vendors (
      id, owner_id, name, type, phone, address, landmark, area, location,
      pan_vat_no, status, approved_at, commission_free_until
    ) values (
      vid, owner, v.name, v.type::public.vendor_type,
      '+97798000101' || lpad(i::text, 2, '0'),
      case when i <= 15 then 'Lalitpur' else 'Kathmandu' end,
      case when i <= 15 then 'Near Jawalakhel Chowk' else 'Near Thamel Chowk' end,
      case when i <= 15 then 'Jawalakhel' else 'Thamel' end,
      extensions.st_setsrid(extensions.st_makepoint(
        hub_lng + (random() - 0.5) * 0.028, hub_lat + (random() - 0.5) * 0.024), 4326)::extensions.geography,
      (700500000 + i)::text, 'approved', now() - interval '20 days', now() + interval '10 days'
    ) on conflict (id) do nothing;

    insert into public.vendor_hours (vendor_id, day_of_week, opens, closes)
    select vid, d, '09:00', '21:00' from generate_series(0, 6) d
    on conflict do nothing;

    -- 4 surplus offers per vendor
    for item in
      select * from (values
        ('Veg momo (10 pcs)', 'भेज मम (१० वटा)', 'veg', 300),
        ('Chicken momo plate', 'चिकेन मम प्लेट', 'non_veg', 350),
        ('Buff momo (10 pcs)', 'बफ मम (१० वटा)', 'non_veg', 280),
        ('Dal bhat set', 'दाल भात सेट', 'veg', 400),
        ('Chicken chowmein', 'चिकेन चाउमिन', 'non_veg', 250),
        ('Bakery surprise bag', 'बेकरी सरप्राइज झोला', 'veg', 500),
        ('Croissants (4)', 'क्रोसोँ (४ वटा)', 'veg', 360),
        ('Sel roti pack', 'सेल रोटी प्याक', 'vegan', 200),
        ('Fruit and veg bag', 'फलफूल र तरकारी झोला', 'vegan', 450),
        ('Paneer pizza', 'पनिर पिज्जा', 'veg', 700),
        ('Thakali khana set', 'थकाली खाना सेट', 'non_veg', 650),
        ('Samosa (6 pcs)', 'समोसा (६ वटा)', 'veg', 180),
        ('Laphing bowl', 'लाफिङ', 'vegan', 150),
        ('Chocolate cake slices', 'चकलेट केक', 'veg', 600),
        ('Chatamari', 'चटामरी', 'non_veg', 320),
        ('Veg thukpa', 'भेज थुक्पा', 'vegan', 260)
      ) as t(title, title_ne, food, rupees)
      order by random()
      limit 4
    loop
      start_at := date_trunc('minute', now()) + make_interval(mins => floor(random() * 120)::int - 30);
      hours := 3 + floor(random() * 6)::int;
      insert into public.offers (
        vendor_id, offer_kind, title, title_ne, description, food_type,
        original_price, price, quantity_total, quantity_reserved,
        pickup_start, pickup_end, expires_at, status
      ) values (
        vid, 'surplus', item.title, item.title_ne, 'Fresh today. Pick up in the window shown.',
        item.food::public.food_type,
        item.rupees * 100,
        (round(item.rupees * (0.4 + random() * 0.25)) * 100)::bigint,
        1 + floor(random() * 8)::int, 0,
        start_at, start_at + make_interval(hours => hours), start_at + make_interval(hours => hours),
        'live'
      );
    end loop;

    -- 1 happy hour deal per vendor: a third run 11:00-23:00 daily (live most
    -- of the day), a third 17:00-19:00 daily, a third 15:00-18:00 Sun-Thu.
    insert into public.offers (
      vendor_id, offer_kind, title, title_ne, description,
      deal_discount_pct, original_price, price, status
    ) values (
      vid, 'happy_hour',
      case i % 3 when 0 then 'Momo happy hour' when 1 then '2 for 1 drinks' else 'Evening snacks deal' end,
      case i % 3 when 0 then 'मम ह्याप्पी आवर' when 1 then 'पेय २ को १' else 'बेलुकीको खाजा डिल' end,
      'Show this pass to staff to get the deal.',
      case when i % 2 = 0 then 20 + (i % 4) * 10 end,
      case when i % 2 = 1 then 40000 end,
      case when i % 2 = 1 then 25000 end,
      'live'
    ) returning id into o_id;

    insert into public.deal_schedules (offer_id, day_of_week, start_time, end_time)
    select o_id, d,
      case i % 3 when 0 then '11:00'::time when 1 then '17:00'::time else '15:00'::time end,
      case i % 3 when 0 then '23:00'::time when 1 then '19:00'::time else '18:00'::time end
    from generate_series(0, 6) d
    where i % 3 <> 2 or d between 0 and 4;
  end loop;
end $$;
