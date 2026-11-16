import {
  AppError,
  isErrorCode,
  type DealPayload,
  type DealWindow,
  type FoodType,
  type OfferPayload,
} from '@food-rescue/shared';

import { supabase } from '../../lib/supabase';
import { uploadOfferImage } from '../../lib/images';
import { photoSlots } from './tabs';

// Offers and deals for the vendor screens (S4). Reads go through RLS (the
// vendor sees their own rows); every write is an RPC from 0013 / 0014.

export type OfferStatus = 'draft' | 'live' | 'sold_out' | 'expired' | 'deactivated' | 'deleted';
export type OfferKind = 'surplus' | 'happy_hour';

export interface VendorOffer {
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
  quantity_reserved: number;
  pickup_start: string | null;
  pickup_end: string | null;
  expires_at: string | null;
  status: OfferStatus;
  version: number;
  created_at: string;
  offer_images: { path: string; position: number }[];
  deal_schedules: DealWindow[];
}

const COLUMNS =
  'id, vendor_id, offer_kind, title, title_ne, description, ingredients, food_type, weight_g, original_price, price, deal_discount_pct, discount_pct, quantity_total, quantity_reserved, pickup_start, pickup_end, expires_at, status, version, created_at, offer_images(path, position), deal_schedules(day_of_week, start_time, end_time)';

/** An RPC error with the field the server refused (VALIDATION_FAILED detail). */
export class OfferError extends AppError {
  readonly field: string | null;
  constructor(code: AppError['code'], field: string | null) {
    super(code);
    this.name = 'OfferError';
    this.field = field;
  }
}

export function toOfferError(
  err: { message?: string; details?: string | null } | null,
): OfferError {
  const code = (err?.message ?? '').trim();
  return new OfferError(isErrorCode(code) ? code : 'UNKNOWN', err?.details ?? null);
}

export async function fetchMyOffers(vendorId: string): Promise<VendorOffer[]> {
  const { data, error } = await supabase
    .from('offers')
    .select(COLUMNS)
    .eq('vendor_id', vendorId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw toOfferError(error);
  return (data ?? []) as VendorOffer[];
}

export async function fetchOffer(id: string): Promise<VendorOffer> {
  const { data, error } = await supabase.from('offers').select(COLUMNS).eq('id', id).single();
  if (error) throw toOfferError(error);
  return data as VendorOffer;
}

export async function createOffer(payload: OfferPayload): Promise<VendorOffer> {
  const { data, error } = await supabase.rpc('create_offer', { p_offer: payload });
  if (error) throw toOfferError(error);
  return data as VendorOffer;
}

export async function updateOffer(
  id: string,
  version: number,
  changes: Partial<OfferPayload>,
): Promise<VendorOffer> {
  const { data, error } = await supabase.rpc('update_offer', {
    p_offer_id: id,
    p_version: version,
    p_changes: changes,
  });
  if (error) throw toOfferError(error);
  return data as VendorOffer;
}

export async function setOfferStatus(id: string, status: OfferStatus): Promise<VendorOffer> {
  const { data, error } = await supabase.rpc('set_offer_status', {
    p_offer_id: id,
    p_status: status,
  });
  if (error) throw toOfferError(error);
  return data as VendorOffer;
}

export async function cloneOffer(
  id: string,
  times: { pickup_start: string; pickup_end: string; expires_at: string },
): Promise<VendorOffer> {
  const { data, error } = await supabase.rpc('clone_offer', {
    p_offer_id: id,
    p_pickup_start: times.pickup_start,
    p_pickup_end: times.pickup_end,
    p_expires_at: times.expires_at,
  });
  if (error) throw toOfferError(error);
  return data as VendorOffer;
}

export async function upsertDeal(
  id: string | null,
  payload: DealPayload,
  version?: number,
): Promise<VendorOffer> {
  const { data, error } = await supabase.rpc('upsert_deal', {
    p_offer_id: id,
    p_deal: payload.deal,
    p_schedules: payload.schedules,
    p_version: version ?? null,
  });
  if (error) throw toOfferError(error);
  return data as VendorOffer;
}

/** A photo on the form: a picked file (to upload) or one already stored in a slot. */
export type OfferPhoto =
  | { kind: 'new'; uri: string }
  | { kind: 'stored'; path: string; position: number };

/**
 * "Draft until images confirm" (T4.3): uploads new photos (1280 px + 320 px
 * thumbnail, retries), then asks the server to confirm the slots to keep.
 */
export async function saveOfferPhotos(offer: VendorOffer, photos: OfferPhoto[]): Promise<void> {
  const slots = photoSlots(photos);
  for (const { photo, position } of slots) {
    if (photo.kind === 'new')
      await uploadOfferImage(offer.vendor_id, offer.id, position, photo.uri);
  }
  const { error } = await supabase.rpc('confirm_offer_images', {
    p_offer_id: offer.id,
    p_positions: slots.map((s) => s.position),
  });
  if (error) throw toOfferError(error);
}

/** The stored photos of an offer, in slot order, for the edit forms. */
export function storedPhotos(offer: VendorOffer): OfferPhoto[] {
  return [...offer.offer_images]
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ kind: 'stored' as const, path: i.path, position: i.position }));
}

/** Public URL for a stored photo (the 320 px card size with thumb). */
export function photoUrl(path: string, thumb = false): string {
  const p = thumb ? path.replace(/\.webp$/, '_thumb.webp') : path;
  return supabase.storage.from('public-images').getPublicUrl(p).data.publicUrl;
}

export interface VendorDashboard {
  vendor_id: string;
  status: string;
  active_offers: number;
  sold_out_offers: number;
  live_deals: number;
  deals: number;
  pickups_today: number;
  collected_today: number;
  available_paisa: number;
  pending_paisa: number;
  rating_avg: number | null;
  rating_count: number;
  strikes_30d: number;
}

export async function fetchDashboard(): Promise<VendorDashboard> {
  const { data, error } = await supabase.rpc('vendor_dashboard');
  if (error) throw toOfferError(error);
  return data as VendorDashboard;
}
