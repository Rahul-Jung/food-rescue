import { pickupAfterToday, type FoodType } from '@food-rescue/shared';

import { supabase } from '../../lib/supabase';
import type { Filters } from '../../store/filters';
import { toOfferError, type OfferKind } from '../offers/api';

// Customer discovery (S5). Reads go through the nearby_offers RPC (0017);
// the waitlist entry through join_waitlist. Nothing writes tables directly.

export const PAGE_SIZE = 20;

export interface NearbyOffer {
  id: string;
  offer_kind: OfferKind;
  title: string;
  title_ne: string | null;
  food_type: FoodType | null;
  original_price: number | null;
  price: number | null;
  discount_pct: number | null;
  quantity_left: number | null;
  pickup_start: string | null;
  pickup_end: string | null;
  expires_at: string | null;
  vendor_id: string;
  vendor_name: string;
  vendor_type: string;
  lat: number;
  lng: number;
  distance_m: number;
  is_featured: boolean;
  deal_live: boolean;
  next_start: string | null;
}

export interface NearbyParams extends Omit<Filters, 'radius'> {
  lat: number;
  lng: number;
  radius: number;
}

export async function fetchNearby(p: NearbyParams, page: number): Promise<NearbyOffer[]> {
  const { data, error } = await supabase.rpc('nearby_offers', {
    p_lat: p.lat,
    p_lng: p.lng,
    p_radius_m: p.radius,
    p_kind: p.kind ?? undefined,
    p_food_type: p.foodType ?? undefined,
    p_vendor_type: p.vendorType ?? undefined,
    p_price_min: p.priceMin ?? undefined,
    p_price_max: p.priceMax ?? undefined,
    p_pickup_after: pickupAfterToday(p.pickupAfter),
    p_q: p.q.trim() || undefined,
    p_sort: p.sort,
    p_page: page,
  });
  if (error) throw toOfferError(error);
  return (data ?? []) as NearbyOffer[];
}

export async function joinWaitlist(
  contact: string,
  area: string | null,
  point: { lat: number; lng: number } | null,
): Promise<void> {
  const { error } = await supabase.rpc('join_waitlist', {
    p_contact: contact.trim(),
    p_area: area ?? undefined,
    p_lat: point?.lat,
    p_lng: point?.lng,
  });
  if (error) throw toOfferError(error);
}
