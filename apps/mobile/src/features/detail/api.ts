import { isErrorCode, type FoodType } from '@food-rescue/shared';

import { supabase } from '../../lib/supabase';
import { OfferError, toOfferError, type OfferKind } from '../offers/api';

// S6 customer reads: offer_detail and vendor_page RPCs (0018), and the
// create-order Edge Function (T6.6). Nothing writes tables directly.

export type PublicOfferStatus = 'live' | 'sold_out' | 'expired' | 'deactivated';

export interface PublicVendor {
  id: string;
  name: string;
  type: string;
  logo_url: string | null;
  description: string | null;
  area: string | null;
  landmark: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  rating_avg: number | null;
  rating_count: number;
}

export interface PublicOffer {
  id: string;
  vendor_id: string;
  offer_kind: OfferKind;
  title: string;
  title_ne: string | null;
  description: string | null;
  ingredients: string | null;
  food_type: FoodType | null;
  weight_g: number | null;
  original_price: number | null;
  price: number | null;
  deal_discount_pct: number | null;
  discount_pct: number | null;
  quantity_total: number | null;
  quantity_left: number | null;
  pickup_start: string | null;
  pickup_end: string | null;
  expires_at: string | null;
  status: PublicOfferStatus;
  version: number;
  images: { path: string; position: number }[];
  schedules: { day_of_week: number; start_time: string; end_time: string }[];
  deal_live: boolean | null;
  live_until: string | null;
  next_start: string | null;
}

export interface OfferDetail extends PublicOffer {
  vendor: PublicVendor;
  server_now: string;
}

export interface VendorPageData extends PublicVendor {
  hours: { day_of_week: number; opens: string; closes: string }[];
  offers: PublicOffer[];
  deals: PublicOffer[];
  reviews: { id: string; rating: number; comment: string | null; created_at: string }[];
  server_now: string;
}

export async function fetchOfferDetail(id: string): Promise<OfferDetail> {
  const { data, error } = await supabase.rpc('offer_detail', { p_offer_id: id });
  if (error) throw toOfferError(error);
  return data as unknown as OfferDetail;
}

export async function fetchVendorPage(id: string): Promise<VendorPageData> {
  const { data, error } = await supabase.rpc('vendor_page', { p_vendor_id: id });
  if (error) throw toOfferError(error);
  return data as unknown as VendorPageData;
}

export interface CreatedOrder {
  order_id: string;
  status: string;
  quantity: number;
  unit_price: number;
  total: number;
  hold_expires_at: string;
  server_now: string;
}

/** C-13 Reserve: the server locks the offer and holds the units for 10 minutes. */
export async function createOrder(offerId: string, quantity: number): Promise<CreatedOrder> {
  const { data, error } = await supabase.functions.invoke<CreatedOrder>('create-order', {
    body: { offer_id: offerId, quantity },
  });
  if (error || !data) {
    // A non-2xx answer carries { error, field } in its body.
    let code = 'UNKNOWN';
    let field: string | null = null;
    const ctx = (error as { context?: Response } | null)?.context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = (await ctx.json()) as { error?: string; field?: string };
        if (body.error) code = body.error;
        field = body.field ?? null;
      } catch {
        // not JSON: keep UNKNOWN
      }
    }
    throw new OfferError(isErrorCode(code) ? code : 'UNKNOWN', field);
  }
  return data;
}

/** Is a surplus offer still bookable right now (also for a cached copy, offline)? */
export function canReserve(
  o: Pick<PublicOffer, 'offer_kind' | 'status' | 'expires_at' | 'quantity_left'>,
  now: number = Date.now(),
): boolean {
  if (o.offer_kind !== 'surplus' || o.status !== 'live') return false;
  if (!o.expires_at || new Date(o.expires_at).getTime() <= now) return false;
  return (o.quantity_left ?? 0) > 0;
}
