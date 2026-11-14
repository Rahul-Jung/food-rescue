-- 0015_cron_offers (T4.7): expire-offers, every minute (section 6 jobs).
-- Plan section 12 calls this 0014_cron_offers.
--   live / sold-out surplus offers past expires_at -> expired
--   live surplus offers with nothing left           -> sold_out   (BR3)
-- Happy hour deals have no expiry; is_deal_live() decides when they show.

create function public.expire_offers()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_expired int;
  v_sold_out int;
begin
  update public.offers
     set status = 'expired', version = version + 1
   where offer_kind = 'surplus'
     and status in ('live', 'sold_out')
     and expires_at <= now();
  get diagnostics v_expired = row_count;

  update public.offers
     set status = 'sold_out', version = version + 1
   where offer_kind = 'surplus'
     and status = 'live'
     and quantity_reserved >= quantity_total;
  get diagnostics v_sold_out = row_count;

  return jsonb_build_object('expired', v_expired, 'sold_out', v_sold_out);
end;
$$;

revoke execute on function public.expire_offers() from public, anon, authenticated;
grant execute on function public.expire_offers() to service_role;

select cron.schedule('expire-offers', '* * * * *', $$select public.expire_offers()$$);
