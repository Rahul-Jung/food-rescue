-- 0010_vendor_rpcs: vendor onboarding and admin vendor RPCs.
--   start_vendor_signup        V-01 (T3.3): role vendor + draft vendor row
--   submit_vendor_application  V-04 / V-05 (T3.5): draft or rejected -> submitted
--   admin_approve_vendor, admin_reject_vendor, admin_suspend_user,
--   admin_set_commission       AD-04 (T3.6); every one writes audit_log
-- Errors use the section 6 codes in the message (FORBIDDEN, VALIDATION_FAILED...).

-- V-01 -------------------------------------------------------------------------
-- The role is never taken from sign-up metadata (0003); this RPC is the only
-- way a signed-in customer becomes a vendor. Idempotent: a second call returns
-- the same vendor.
create function public.start_vendor_signup()
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_vendor_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  select * into v_profile from public.profiles where id = v_uid for update;
  if not found or v_profile.status <> 'active' then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  if v_profile.role = 'admin' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_profile.role <> 'vendor' then
    update public.profiles set role = 'vendor' where id = v_uid;
  end if;

  insert into public.vendors (owner_id, phone, email)
  values (v_uid, v_profile.phone, v_profile.email)
  on conflict (owner_id) do nothing;

  select id into v_vendor_id from public.vendors where owner_id = v_uid;
  return v_vendor_id;
end;
$$;

-- V-04 Submit / V-05 Resubmit ---------------------------------------------------
-- All A3 fields present and a pin; draft or rejected -> submitted.
create function public.vendor_missing_fields(v public.vendors)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array_remove(array[
    case when coalesce(btrim(v.name), '') = '' then 'name' end,
    case when v.type is null then 'type' end,
    case when coalesce(btrim(v.phone), '') = '' then 'phone' end,
    case when coalesce(btrim(v.address), '') = '' then 'address' end,
    case when v.location is null then 'location' end,
    case when coalesce(btrim(v.pan_vat_no), '') = '' then 'pan_vat_no' end,
    case when coalesce(btrim(v.pan_doc_path), '') = '' then 'pan_doc_path' end
  ], null);
$$;

create function public.submit_vendor_application()
returns public.vendors
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v public.vendors%rowtype;
  v_missing text[];
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if not public.jwt_is_active() then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  select * into v from public.vendors where owner_id = v_uid for update;
  if not found then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v.status not in ('draft', 'rejected') then
    raise exception 'VALIDATION_FAILED' using errcode = '22023',
      detail = 'status', hint = 'only a draft or rejected application can be submitted';
  end if;
  v_missing := public.vendor_missing_fields(v);
  if cardinality(v_missing) > 0 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023',
      detail = array_to_string(v_missing, ','), hint = 'missing fields';
  end if;

  update public.vendors
     set status = 'submitted', reject_reason = null, updated_at = now()
   where id = v.id
  returning * into v;
  return v;
end;
$$;

-- Admin (aal2) -----------------------------------------------------------------
create function public.admin_require()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.jwt_is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

create function public.admin_approve_vendor(p_vendor_id uuid)
returns public.vendors
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.admin_require();
  v_before public.vendors%rowtype;
  v_after public.vendors%rowtype;
  v_free_days int := coalesce((public.app_setting('free_days') #>> '{}')::int, 30);
begin
  select * into v_before from public.vendors where id = p_vendor_id for update;
  if not found then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'vendor_id';
  end if;
  if not (v_before.status in ('submitted', 'suspended')
          or (v_before.status = 'approved' and v_before.pending_review)) then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'status';
  end if;

  -- The 30 free days start at the first approval only (BR10).
  update public.vendors
     set status = 'approved',
         reject_reason = null,
         pending_review = false,
         approved_at = coalesce(approved_at, now()),
         commission_free_until = coalesce(commission_free_until, now() + make_interval(days => v_free_days))
   where id = p_vendor_id
  returning * into v_after;

  update public.profiles set role = 'vendor', status = 'active'
   where id = v_after.owner_id and role <> 'admin';

  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (v_admin, 'admin_approve_vendor', 'vendor', p_vendor_id::text,
          to_jsonb(v_before), to_jsonb(v_after));
  return v_after;
end;
$$;

create function public.admin_reject_vendor(p_vendor_id uuid, p_reason text)
returns public.vendors
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.admin_require();
  v_before public.vendors%rowtype;
  v_after public.vendors%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_reason = '' or char_length(v_reason) > 500 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'reason';
  end if;
  select * into v_before from public.vendors where id = p_vendor_id for update;
  if not found then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'vendor_id';
  end if;
  if v_before.status <> 'submitted' then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'status';
  end if;

  update public.vendors
     set status = 'rejected', reject_reason = v_reason
   where id = p_vendor_id
  returning * into v_after;

  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (v_admin, 'admin_reject_vendor', 'vendor', p_vendor_id::text,
          to_jsonb(v_before), to_jsonb(v_after) || jsonb_build_object('reason', v_reason));
  return v_after;
end;
$$;

-- Suspends any non-admin user. A vendor's row is suspended too, which hides it
-- from vendors_public (and its offers, later) at once. Refresh tokens are
-- revoked so the app is logged out on its next refresh (section 8).
create function public.admin_suspend_user(p_user_id uuid, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.admin_require();
  v_before public.profiles%rowtype;
  v_vendor_before public.vendors%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_reason = '' or char_length(v_reason) > 500 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'reason';
  end if;
  select * into v_before from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'user_id';
  end if;
  if v_before.role = 'admin' or p_user_id = v_admin then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.profiles set status = 'suspended' where id = p_user_id;

  select * into v_vendor_before from public.vendors where owner_id = p_user_id for update;
  if found then
    update public.vendors set status = 'suspended' where id = v_vendor_before.id;
  end if;

  delete from auth.refresh_tokens where user_id = p_user_id::text;
  delete from auth.sessions where user_id = p_user_id;

  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (v_admin, 'admin_suspend_user', 'profile', p_user_id::text,
          jsonb_build_object('status', v_before.status,
                             'vendor_status', v_vendor_before.status),
          jsonb_build_object('status', 'suspended',
                             'vendor_status', case when v_vendor_before.id is null then null else 'suspended' end,
                             'reason', v_reason));
end;
$$;

create function public.admin_set_commission(
  p_vendor_id uuid,
  p_rate_bp int,
  p_free_until timestamptz,
  p_reason text default null
)
returns public.vendors
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.admin_require();
  v_before public.vendors%rowtype;
  v_after public.vendors%rowtype;
begin
  if p_rate_bp is null or p_rate_bp < 0 or p_rate_bp > 5000 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'rate_bp';
  end if;
  select * into v_before from public.vendors where id = p_vendor_id for update;
  if not found then
    raise exception 'VALIDATION_FAILED' using errcode = '22023', detail = 'vendor_id';
  end if;

  update public.vendors
     set commission_rate_bp = p_rate_bp, commission_free_until = p_free_until
   where id = p_vendor_id
  returning * into v_after;

  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (v_admin, 'admin_set_commission', 'vendor', p_vendor_id::text,
          jsonb_build_object('commission_rate_bp', v_before.commission_rate_bp,
                             'commission_free_until', v_before.commission_free_until),
          jsonb_build_object('commission_rate_bp', v_after.commission_rate_bp,
                             'commission_free_until', v_after.commission_free_until,
                             'reason', nullif(btrim(coalesce(p_reason, '')), '')));
  return v_after;
end;
$$;

-- Grants -------------------------------------------------------------------------
revoke execute on function public.start_vendor_signup() from public, anon;
revoke execute on function public.vendor_missing_fields(public.vendors) from public, anon;
revoke execute on function public.submit_vendor_application() from public, anon;
revoke execute on function public.admin_require() from public, anon;
revoke execute on function public.admin_approve_vendor(uuid) from public, anon;
revoke execute on function public.admin_reject_vendor(uuid, text) from public, anon;
revoke execute on function public.admin_suspend_user(uuid, text) from public, anon;
revoke execute on function public.admin_set_commission(uuid, int, timestamptz, text) from public, anon;

grant execute on function public.start_vendor_signup() to authenticated;
grant execute on function public.vendor_missing_fields(public.vendors) to authenticated;
grant execute on function public.submit_vendor_application() to authenticated;
grant execute on function public.admin_require() to authenticated;
grant execute on function public.admin_approve_vendor(uuid) to authenticated;
grant execute on function public.admin_reject_vendor(uuid, text) to authenticated;
grant execute on function public.admin_suspend_user(uuid, text) to authenticated;
grant execute on function public.admin_set_commission(uuid, int, timestamptz, text) to authenticated;
