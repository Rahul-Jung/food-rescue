-- T3.1 done-when: vendor edits own row but not status or commission; customer
-- sees only approved vendors. Plus the rest of the RLS matrix for vendors and
-- vendor_hours, and the storage bucket policies.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Schema ----------------------------------------------------------------------
select has_table('public', 'vendors', 'vendors table exists');
select has_table('public', 'vendor_hours', 'vendor_hours table exists');
select has_view('public', 'vendors_public', 'vendors_public view exists');
select hasnt_column('public', 'vendors_public', 'pan_vat_no', 'vendors_public hides PAN');
select hasnt_column('public', 'vendors_public', 'commission_rate_bp', 'vendors_public hides commission');
select hasnt_column('public', 'vendors_public', 'payout_account', 'vendors_public hides payout account');
select is(
  (select array_agg(id || ':' || public order by id) from storage.buckets
   where id in ('public-images', 'private-docs')),
  array['private-docs:false', 'public-images:true'],
  'buckets: public-images public, private-docs private'
);

-- Setup (as the test runner, which bypasses RLS and the column guard) --------
create temp table ids (name text primary key, id uuid) on commit drop;
grant select on ids to authenticated;
insert into ids values
  ('owner', tests.create_user('owner@example.test', 'vendor')),
  ('other_owner', tests.create_user('other@example.test', 'vendor')),
  ('new_owner', tests.create_user('new@example.test', 'customer')),
  ('customer', tests.create_user('sita@example.test')),
  ('suspended', tests.create_user('gone@example.test', 'customer', 'suspended')),
  ('admin', tests.create_user('admin@example.test', 'admin'));

with v as (
  insert into public.vendors (owner_id, name, pan_vat_no)
  values ((select id from ids where name = 'owner'), 'Draft Momo', '600000001')
  returning id
)
insert into ids select 'v_draft', id from v;
with v as (
  insert into public.vendors (owner_id, name, status, approved_at, pan_vat_no)
  values ((select id from ids where name = 'other_owner'), 'Open Bakery', 'approved', now(), '600000002')
  returning id
)
insert into ids select 'v_approved', id from v;
insert into public.vendor_hours values
  ((select id from ids where name = 'v_approved'), 1, '08:00', '20:00'),
  ((select id from ids where name = 'v_draft'), 1, '09:00', '21:00');

-- New vendor (V-01 path) -------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as((select id from ids where name = 'new_owner'));
select throws_ok(
  $$ insert into public.vendors (owner_id, name, status) values ((select id from ids where name = 'new_owner'), 'Sneaky', 'approved') $$,
  '42501', 'FORBIDDEN',
  'a new vendor cannot start approved'
);
select lives_ok(
  $$ insert into public.vendors (owner_id, name) values ((select id from ids where name = 'new_owner'), 'New Cafe') $$,
  'a user can create their own draft vendor'
);
select throws_ok(
  $$ insert into public.vendors (owner_id, name) values ((select id from ids where name = 'customer'), 'Not mine') $$,
  '42501', null,
  'a user cannot create a vendor for someone else'
);

-- Vendor owner -----------------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as((select id from ids where name = 'owner'));
select is((select count(*)::int from public.vendors), 1, 'owner sees only their own vendor row');
select lives_ok(
  $$ update public.vendors set name = 'Draft Momo House', area = 'Thamel' where id = (select id from ids where name = 'v_draft') $$,
  'owner can edit own name and area'
);
select is(
  (select name from public.vendors where id = (select id from ids where name = 'v_draft')),
  'Draft Momo House',
  'own edit saved'
);
select throws_ok(
  $$ update public.vendors set status = 'approved' where id = (select id from ids where name = 'v_draft') $$,
  '42501', 'FORBIDDEN', 'owner cannot change status'
);
select throws_ok(
  $$ update public.vendors set commission_rate_bp = 0 where id = (select id from ids where name = 'v_draft') $$,
  '42501', 'FORBIDDEN', 'owner cannot change commission rate'
);
select throws_ok(
  $$ update public.vendors set commission_free_until = now() + interval '1 year' where id = (select id from ids where name = 'v_draft') $$,
  '42501', 'FORBIDDEN', 'owner cannot change commission free period'
);
select throws_ok(
  $$ update public.vendors set strikes_30d = 0, approved_at = now() where id = (select id from ids where name = 'v_draft') $$,
  '42501', 'FORBIDDEN', 'owner cannot change strikes or approval date'
);
update public.vendors set name = 'Hacked' where id = (select id from ids where name = 'v_approved');
select lives_ok(
  $$ insert into public.vendor_hours values ((select id from ids where name = 'v_draft'), 2, '09:00', '21:00') $$,
  'owner can add own hours'
);
select throws_ok(
  $$ insert into public.vendor_hours values ((select id from ids where name = 'v_approved'), 3, '09:00', '21:00') $$,
  '42501', null, 'owner cannot add hours to another vendor'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('private-docs', 'pan/' || (select id from ids where name = 'v_draft') || '/pan.pdf') $$,
  'owner can upload their own PAN document'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('private-docs', 'pan/' || (select id from ids where name = 'v_approved') || '/pan.pdf') $$,
  '42501', null, 'owner cannot upload into another vendor''s PAN folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('public-images', 'vendors/' || (select id from ids where name = 'v_draft') || '/logo.webp') $$,
  '42501', null, 'public-images cannot be written directly (upload-sign only)'
);

-- Customer ---------------------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as((select id from ids where name = 'customer'));
select is_empty($$ select 1 from public.vendors $$, 'customer cannot read the vendors table');
select results_eq(
  $$ select name from public.vendors_public $$,
  $$ values ('Open Bakery') $$,
  'customer sees only the approved vendor (not edited by the other owner)'
);
select results_eq(
  $$ select day_of_week::int from public.vendor_hours $$,
  $$ values (1) $$,
  'customer sees hours of approved vendors only'
);
select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'private-docs' $$,
  'customer cannot see PAN documents'
);

-- Suspended user ---------------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as((select id from ids where name = 'suspended'));
select is_empty($$ select 1 from public.vendors_public $$, 'suspended user sees no vendors');

-- Admin (aal2) -----------------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as_admin((select id from ids where name = 'admin'));
select is((select count(*)::int from public.vendors), 3, 'admin sees all vendor rows');
select lives_ok(
  $$ update public.vendors set status = 'approved', approved_at = now(), commission_free_until = now() + interval '30 days' where id = (select id from ids where name = 'v_draft') $$,
  'admin can approve a vendor'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'private-docs'),
  1, 'admin can see PAN documents'
);

-- Admin without TOTP is just a user ------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as((select id from ids where name = 'admin'), 'aal1');
select is_empty($$ select 1 from public.vendors $$, 'admin without TOTP cannot read vendors');

select tests.clear_authentication();
select is(
  (select status::text from public.vendors where id = (select id from ids where name = 'v_draft')),
  'approved', 'admin approval saved'
);

select * from finish();
rollback;
