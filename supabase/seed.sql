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
