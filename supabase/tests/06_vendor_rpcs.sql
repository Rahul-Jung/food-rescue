-- T3.3 / T3.5 / T3.6 / T3.8: start_vendor_signup, submit_vendor_application
-- (missing fields; rejected vendor can edit and resubmit), admin vendor RPCs
-- (approve sets approved_at and +30 free days; every action in audit_log),
-- and pending_review when an approved vendor edits name / PAN / pin.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

create temp table ids (name text primary key, id uuid) on commit drop;
grant select on ids to authenticated;
insert into ids values
  ('shop', tests.create_user('shop@example.test')),
  ('admin', tests.create_user('admin@example.test', 'admin')),
  ('customer', tests.create_user('sita@example.test'));

-- V-01: start_vendor_signup ------------------------------------------------------
select tests.authenticate_as((select id from ids where name = 'shop'));
select lives_ok($$ select public.start_vendor_signup() $$, 'customer can start a business sign-up');
select tests.clear_authentication();
select is(
  (select role::text from public.profiles where id = (select id from ids where name = 'shop')),
  'vendor', 'profile role is now vendor'
);
select is(
  (select status::text from public.vendors where owner_id = (select id from ids where name = 'shop')),
  'draft', 'a draft vendor row was created'
);
insert into ids select 'v', id from public.vendors where owner_id = (select id from ids where name = 'shop');

select tests.authenticate_as((select id from ids where name = 'shop'));
select is(public.start_vendor_signup(), (select id from ids where name = 'v'), 'second call returns the same vendor');
select tests.clear_authentication();
select is(
  (select count(*)::int from public.vendors where owner_id = (select id from ids where name = 'shop')),
  1, 'still one vendor row'
);

select tests.authenticate_as_admin((select id from ids where name = 'admin'));
select throws_ok($$ select public.start_vendor_signup() $$, '42501', 'FORBIDDEN', 'an admin cannot become a vendor');

-- T3.5: submit with missing fields -------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as((select id from ids where name = 'shop'));
select throws_ok(
  $$ select public.submit_vendor_application() $$,
  '22023', 'VALIDATION_FAILED', 'submit refused while fields are missing'
);
update public.vendors
   set name = 'Momo Ghar', type = 'restaurant', phone = '+9779800000101', address = 'Thamel Marg',
       pan_vat_no = '601234567', pan_doc_path = 'pan/' || (select id from ids where name = 'v') || '/pan.webp'
 where id = (select id from ids where name = 'v');
select throws_ok(
  $$ select public.submit_vendor_application() $$,
  '22023', 'VALIDATION_FAILED', 'cannot submit without a pin'
);
select is(
  (select status::text from public.vendors where id = (select id from ids where name = 'v')),
  'draft', 'still a draft'
);
update public.vendors set location = extensions.st_geogfromtext('SRID=4326;POINT(85.31 27.71)')
 where id = (select id from ids where name = 'v');
select lives_ok($$ select public.submit_vendor_application() $$, 'complete application submits');
select is(
  (select status::text from public.vendors where id = (select id from ids where name = 'v')),
  'submitted', 'status is submitted'
);
select throws_ok(
  $$ select public.submit_vendor_application() $$,
  '22023', 'VALIDATION_FAILED', 'a submitted application cannot be submitted again'
);

-- Non-admins cannot use admin RPCs ---------------------------------------------------
select throws_ok(
  $$ select public.admin_approve_vendor((select id from ids where name = 'v')) $$,
  '42501', 'FORBIDDEN', 'vendor cannot approve themselves'
);
select tests.clear_authentication();
select tests.authenticate_as((select id from ids where name = 'admin'), 'aal1');
select throws_ok(
  $$ select public.admin_approve_vendor((select id from ids where name = 'v')) $$,
  '42501', 'FORBIDDEN', 'admin without TOTP cannot approve'
);

-- T3.6: reject with reason, then edit and resubmit ----------------------------------
select tests.clear_authentication();
select tests.authenticate_as_admin((select id from ids where name = 'admin'));
select throws_ok(
  $$ select public.admin_reject_vendor((select id from ids where name = 'v'), '  ') $$,
  '22023', 'VALIDATION_FAILED', 'reject needs a reason'
);
select lives_ok(
  $$ select public.admin_reject_vendor((select id from ids where name = 'v'), 'PAN photo is blurry') $$,
  'admin rejects with a reason'
);
select tests.clear_authentication();
select is(
  (select status::text || ':' || reject_reason from public.vendors where id = (select id from ids where name = 'v')),
  'rejected:PAN photo is blurry', 'vendor is rejected with the reason'
);

select tests.authenticate_as((select id from ids where name = 'shop'));
select lives_ok(
  $$ update public.vendors set pan_doc_path = 'pan/' || (select id from ids where name = 'v') || '/pan2.webp' where id = (select id from ids where name = 'v') $$,
  'rejected vendor can edit'
);
select lives_ok($$ select public.submit_vendor_application() $$, 'rejected vendor can resubmit');
select tests.clear_authentication();
select is(
  (select status::text || ':' || coalesce(reject_reason, '-') from public.vendors where id = (select id from ids where name = 'v')),
  'submitted:-', 'resubmitted, old reason cleared'
);

-- Approve ----------------------------------------------------------------------------
select tests.authenticate_as_admin((select id from ids where name = 'admin'));
select lives_ok(
  $$ select public.admin_approve_vendor((select id from ids where name = 'v')) $$,
  'admin approves'
);
select tests.clear_authentication();
select ok(
  (select approved_at is not null
      and commission_free_until between now() + interval '29 days 23 hours' and now() + interval '30 days 1 hour'
     from public.vendors where id = (select id from ids where name = 'v')),
  'approve sets approved_at and commission_free_until = +30 days'
);

-- T3.8: approved vendor edits PAN -> pending_review, still approved ----------------------
select tests.authenticate_as((select id from ids where name = 'shop'));
select lives_ok(
  $$ update public.vendors set description = 'Best momo' where id = (select id from ids where name = 'v') $$,
  'approved vendor edits description'
);
select is(
  (select pending_review from public.vendors where id = (select id from ids where name = 'v')),
  false, 'description edit does not need review'
);
select lives_ok(
  $$ update public.vendors set pan_vat_no = '601234568' where id = (select id from ids where name = 'v') $$,
  'approved vendor edits PAN'
);
select is(
  (select status::text || ':' || pending_review from public.vendors where id = (select id from ids where name = 'v')),
  'approved:true', 'PAN edit puts the vendor back in the queue and keeps it approved'
);

select tests.clear_authentication();
select tests.authenticate_as_admin((select id from ids where name = 'admin'));
select lives_ok(
  $$ select public.admin_approve_vendor((select id from ids where name = 'v')) $$,
  'admin re-approves after review'
);
select tests.clear_authentication();
select is(
  (select pending_review from public.vendors where id = (select id from ids where name = 'v')),
  false, 're-approval clears pending_review'
);

-- Commission and suspend -------------------------------------------------------------
select tests.authenticate_as_admin((select id from ids where name = 'admin'));
select throws_ok(
  $$ select public.admin_set_commission((select id from ids where name = 'v'), 6000, null) $$,
  '22023', 'VALIDATION_FAILED', 'commission over 50% refused'
);
select lives_ok(
  $$ select public.admin_set_commission((select id from ids where name = 'v'), 1000, now() + interval '60 days', 'pilot partner') $$,
  'admin sets commission and free-until'
);
select throws_ok(
  $$ select public.admin_suspend_user((select id from ids where name = 'admin'), 'test') $$,
  '42501', 'FORBIDDEN', 'an admin cannot be suspended'
);
select lives_ok(
  $$ select public.admin_suspend_user((select id from ids where name = 'shop'), 'Fake documents') $$,
  'admin suspends the vendor owner'
);
select tests.clear_authentication();
select is(
  (select p.status::text || ':' || v.status::text from public.profiles p join public.vendors v on v.owner_id = p.id
    where p.id = (select id from ids where name = 'shop')),
  'suspended:suspended', 'profile and vendor are suspended'
);

select results_eq(
  $$ select action from public.audit_log where entity_id in ((select id::text from ids where name = 'v'), (select id::text from ids where name = 'shop')) order by id $$,
  $$ values ('admin_reject_vendor'), ('admin_approve_vendor'), ('admin_approve_vendor'), ('admin_set_commission'), ('admin_suspend_user') $$,
  'every admin action is in audit_log'
);

select * from finish();
rollback;
