-- 0007_support_contact (T2.7): support contact shown on the blocked screen for
-- suspended / deleted users. Placeholders: change them in app_settings (later
-- through the admin settings screen) once the real support line and inbox exist.
insert into public.app_settings (key, value, is_public) values
  ('support_phone', '"+977-9800000000"', true),
  ('support_email', '"support@foodrescue.example"', true)
on conflict (key) do nothing;
