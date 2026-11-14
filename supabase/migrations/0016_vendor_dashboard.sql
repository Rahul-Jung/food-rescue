-- 0016_vendor_dashboard (T4.8): V-06 first version. Section 6 lists today's
-- pickups, collected, active offers, balances, rating and strikes. Orders,
-- ledger and reviews come in S6 / S7, so those numbers are 0 / null for now
-- and the screen labels them; active offers and strikes are real.

create function public.vendor_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.vendors%rowtype;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if not public.jwt_is_active() then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  select * into v from public.vendors where owner_id = auth.uid();
  if not found then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'vendor_id', v.id,
    'status', v.status,
    'active_offers', (
      select count(*) from public.offers
       where vendor_id = v.id and offer_kind = 'surplus' and status = 'live'),
    'sold_out_offers', (
      select count(*) from public.offers
       where vendor_id = v.id and offer_kind = 'surplus' and status = 'sold_out'),
    'live_deals', (
      select count(*) from public.offers o
       where o.vendor_id = v.id and o.offer_kind = 'happy_hour' and public.is_deal_live(o.id)),
    'deals', (
      select count(*) from public.offers
       where vendor_id = v.id and offer_kind = 'happy_hour' and status in ('live', 'deactivated', 'draft')),
    'pickups_today', 0,
    'collected_today', 0,
    'available_paisa', 0,
    'pending_paisa', 0,
    'rating_avg', null,
    'rating_count', 0,
    'strikes_30d', v.strikes_30d
  );
end;
$$;

revoke execute on function public.vendor_dashboard() from public, anon;
grant execute on function public.vendor_dashboard() to authenticated;
