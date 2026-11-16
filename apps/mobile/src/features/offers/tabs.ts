// V-07 tabs and the field -> message mapping, pure so they are unit tested.
import type { OfferPhoto, VendorOffer } from './api';

export type OfferTab = 'active' | 'happy' | 'past';

/** Active: surplus offers not yet over; Happy hour: deals; Past: expired surplus. */
export function offerTab(o: Pick<VendorOffer, 'offer_kind' | 'status'>): OfferTab | null {
  if (o.status === 'deleted') return null;
  if (o.offer_kind === 'happy_hour') return 'happy';
  return o.status === 'expired' ? 'past' : 'active';
}

export function groupOffers<T extends Pick<VendorOffer, 'offer_kind' | 'status'>>(offers: T[]) {
  const out: Record<OfferTab, T[]> = { active: [], happy: [], past: [] };
  for (const o of offers) {
    const tab = offerTab(o);
    if (tab) out[tab].push(o);
  }
  return out;
}

/** Which actions V-07 offers for an offer in this state. */
export function offerActions(o: Pick<VendorOffer, 'offer_kind' | 'status'>) {
  const surplus = o.offer_kind === 'surplus';
  return {
    edit: o.status !== 'expired' && o.status !== 'deleted',
    publish: o.status === 'draft',
    soldOut: surplus && o.status === 'live',
    deactivate: o.status === 'live' || o.status === 'sold_out',
    reactivate: o.status === 'deactivated',
    reopen: surplus && o.status === 'sold_out',
    clone: surplus && o.status === 'expired',
    delete: o.status !== 'deleted',
  };
}

/**
 * Server field (VALIDATION_FAILED detail, or a table constraint name) -> the
 * form field to show the error on.
 */
export function serverFieldToForm(field: string | null): string | null {
  if (!field) return null;
  const map: Record<string, string> = {
    offers_price_below_original: 'price',
    offers_quantity_bounds: 'quantity_total',
    offers_pickup_order: 'pickup_end',
    offers_expiry_before_pickup_end: 'expires_at',
    offers_title_check: 'title',
    offers_weight_g_check: 'weight_g',
    offers_price_check: 'price',
    offers_original_price_check: 'original_price',
    offers_deal_discount_pct_check: 'discount',
    offers_happy_hour_fields: 'discount',
    offers_surplus_fields: 'food_type',
    pickup_extend_only: 'pickup_end',
    images: 'photos',
    schedules: 'windows',
  };
  return map[field] ?? field;
}

/**
 * Slots for the photos: stored photos keep theirs, new ones take the lowest
 * free slot (0-4). Pure, so it is unit tested.
 */
export function photoSlots(photos: OfferPhoto[]): { photo: OfferPhoto; position: number }[] {
  const used = new Set(
    photos.filter((p) => p.kind === 'stored').map((p) => (p as { position: number }).position),
  );
  const out: { photo: OfferPhoto; position: number }[] = [];
  for (const photo of photos) {
    if (photo.kind === 'stored') {
      out.push({ photo, position: photo.position });
      continue;
    }
    let n = 0;
    while (used.has(n)) n++;
    used.add(n);
    out.push({ photo, position: n });
  }
  return out;
}
