// Offers and happy hour deals (S4): the V1 / V2 / H1 rules the app checks
// before calling the RPCs (0013, 0014 repeat them on the server), and the
// money / time helpers the offer screens use.

import { nptParts, NPT_OFFSET_MINUTES } from './time';
import { latinDigits, normaliseTime } from './vendor';

export const OFFER_TITLE_MAX = 120;
export const OFFER_TEXT_MAX = 1000;
export const OFFER_PHOTOS_MAX = 3; // V-08 (the table allows 5)
export const FOOD_TYPES = ['veg', 'non_veg', 'vegan'] as const;
export type FoodType = (typeof FOOD_TYPES)[number];

/** "150", "150.5", "१५०", "Rs 1,250" -> paisa; null when not a positive amount. */
export function rupeesToPaisa(input: string): number | null {
  const s = latinDigits(input)
    .replace(/rs\.?|रू\.?|,|\s/gi, '')
    .trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole = '0', frac = ''] = s.split('.');
  const paisa = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  return Number.isSafeInteger(paisa) && paisa > 0 ? paisa : null;
}

/** "150.50" for showing paisa back in an input. */
export function paisaToRupeesInput(paisa: number | null | undefined): string {
  if (!paisa) return '';
  const r = Math.floor(paisa / 100);
  const p = paisa % 100;
  return p ? `${r}.${String(p).padStart(2, '0')}` : String(r);
}

/** Same as the generated column: round(100 - price * 100 / original). */
export function discountPercent(originalPaisa: number, pricePaisa: number): number | null {
  if (!(originalPaisa > 0) || !(pricePaisa > 0) || pricePaisa >= originalPaisa) return null;
  return Math.round(100 - (pricePaisa * 100) / originalPaisa);
}

/** The Nepal calendar day of `now` as YYYY-MM-DD. */
export function nptToday(now: Date = new Date()): string {
  const p = nptParts(now);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const OFFSET = `+${String(Math.floor(NPT_OFFSET_MINUTES / 60)).padStart(2, '0')}:${String(NPT_OFFSET_MINUTES % 60).padStart(2, '0')}`;

/** "18:30" on a Nepal day -> ISO instant with +05:45. */
export function nptAt(ymd: string, hhmm: string): string {
  return `${ymd}T${hhmm}:00${OFFSET}`;
}

/** "HH:MM" in Nepal time for an instant. */
export function nptClock(value: Date | string): string {
  const p = nptParts(value);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

export interface PickupTimes {
  pickup_start: string;
  pickup_end: string;
  expires_at: string;
}

/**
 * Today's pickup window from clock times. An end (or expiry) at or before
 * the start means after midnight, the next day. Expiry defaults to the end.
 */
export function pickupTimesToday(
  start: string,
  end: string,
  expires?: string,
  now: Date = new Date(),
): PickupTimes | null {
  const s = normaliseTime(start);
  const e = normaliseTime(end);
  const x = expires ? normaliseTime(expires) : e;
  if (!s || !e || !x) return null;
  const day = nptToday(now);
  const endDay = e <= s ? addDays(day, 1) : day;
  const expDay = x <= s ? addDays(day, 1) : day;
  return {
    pickup_start: nptAt(day, s),
    pickup_end: nptAt(endDay, e),
    expires_at: nptAt(expDay, x),
  };
}

export type OfferField =
  | 'title'
  | 'food_type'
  | 'weight_g'
  | 'original_price'
  | 'price'
  | 'quantity_total'
  | 'pickup_start'
  | 'pickup_end'
  | 'expires_at'
  | 'photos';

export interface OfferForm {
  title: string;
  title_ne?: string;
  ingredients?: string;
  description?: string;
  food_type: FoodType | null;
  weight_g?: string;
  original_price: string;
  price: string;
  quantity_total: string;
  pickup_start: string;
  pickup_end: string;
  expires_at?: string;
  photos: number;
}

export interface OfferPayload extends PickupTimes {
  title: string;
  title_ne: string | null;
  ingredients: string | null;
  description: string | null;
  food_type: FoodType;
  weight_g: number | null;
  original_price: number;
  price: number;
  quantity_total: number;
}

/**
 * V1 checks with one error per field (inline errors on V-08 / V-09).
 * `minQuantity` is the V2 floor (units already reserved) when editing.
 */
export function validateOffer(
  f: OfferForm,
  now: Date = new Date(),
  opts: { minQuantity?: number; requirePhoto?: boolean } = {},
): { ok: true; value: OfferPayload } | { ok: false; errors: Partial<Record<OfferField, string>> } {
  const errors: Partial<Record<OfferField, string>> = {};
  const title = f.title.trim();
  if (title.length < 2 || title.length > OFFER_TITLE_MAX) errors.title = 'title';
  if (!f.food_type || !(FOOD_TYPES as readonly string[]).includes(f.food_type)) {
    errors.food_type = 'food_type';
  }
  let weight: number | null = null;
  if (f.weight_g && f.weight_g.trim()) {
    weight = Number(latinDigits(f.weight_g.trim()));
    if (!Number.isInteger(weight) || weight < 1 || weight > 100000) errors.weight_g = 'weight_g';
  }
  const original = rupeesToPaisa(f.original_price);
  const price = rupeesToPaisa(f.price);
  if (!original) errors.original_price = 'original_price';
  if (!price) errors.price = 'price';
  else if (original && price >= original) errors.price = 'price_below_original';
  const qty = Number(latinDigits(f.quantity_total.trim()));
  const floor = Math.max(1, opts.minQuantity ?? 1);
  if (!Number.isInteger(qty) || qty < floor || qty > 999) {
    errors.quantity_total = opts.minQuantity ? 'quantity_floor' : 'quantity_total';
  }
  const times = pickupTimesToday(f.pickup_start, f.pickup_end, f.expires_at || undefined, now);
  if (!times) {
    if (!normaliseTime(f.pickup_start)) errors.pickup_start = 'time';
    if (!normaliseTime(f.pickup_end)) errors.pickup_end = 'time';
    if (f.expires_at && !normaliseTime(f.expires_at)) errors.expires_at = 'time';
  } else {
    if (new Date(times.pickup_end) <= now) errors.pickup_end = 'pickup_end_future';
    if (new Date(times.expires_at) > new Date(times.pickup_end))
      errors.expires_at = 'expires_after_end';
    else if (new Date(times.expires_at) <= now) errors.expires_at = 'expires_future';
  }
  if ((opts.requirePhoto ?? true) && f.photos < 1) errors.photos = 'photos';

  if (Object.keys(errors).length > 0 || !times || !original || !price || !f.food_type) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      title,
      title_ne: f.title_ne?.trim() || null,
      ingredients: f.ingredients?.trim() || null,
      description: f.description?.trim() || null,
      food_type: f.food_type,
      weight_g: weight,
      original_price: original,
      price,
      quantity_total: qty,
      ...times,
    },
  };
}

// Happy hour deals (V-12, H1) ------------------------------------------------------

export interface DealWindow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export type DealField = 'title' | 'discount' | 'original_price' | 'price' | 'windows' | 'photos';

export interface DealForm {
  title: string;
  title_ne?: string;
  description?: string;
  mode: 'percent' | 'price';
  discount_pct: string;
  original_price: string;
  price: string;
  /** Days chosen for all windows, 0 = Sunday. */
  days: number[];
  /** Clock times; several windows per day allowed. */
  times: { start: string; end: string }[];
  photos: number;
}

export interface DealPayload {
  deal: {
    title: string;
    title_ne: string | null;
    description: string | null;
    deal_discount_pct: number | null;
    original_price: number | null;
    price: number | null;
  };
  schedules: DealWindow[];
}

export function validateDeal(
  f: DealForm,
): { ok: true; value: DealPayload } | { ok: false; errors: Partial<Record<DealField, string>> } {
  const errors: Partial<Record<DealField, string>> = {};
  const title = f.title.trim();
  if (title.length < 2 || title.length > OFFER_TITLE_MAX) errors.title = 'title';

  let pct: number | null = null;
  let original: number | null = null;
  let price: number | null = null;
  if (f.mode === 'percent') {
    pct = Number(latinDigits(f.discount_pct.trim()));
    if (!Number.isInteger(pct) || pct < 1 || pct > 90) errors.discount = 'discount';
  } else {
    original = rupeesToPaisa(f.original_price);
    price = rupeesToPaisa(f.price);
    if (!original) errors.original_price = 'original_price';
    if (!price) errors.price = 'price';
    else if (original && price >= original) errors.price = 'price_below_original';
  }

  const schedules: DealWindow[] = [];
  const days = [...new Set(f.days)].filter((d) => d >= 0 && d <= 6).sort();
  for (const w of f.times) {
    const s = normaliseTime(w.start);
    const e = normaliseTime(w.end);
    if (!s || !e || s === e) {
      errors.windows = 'windows';
      break;
    }
    for (const d of days) schedules.push({ day_of_week: d, start_time: s, end_time: e });
  }
  if (days.length === 0 || f.times.length === 0) errors.windows = 'windows';
  if (f.photos < 1) errors.photos = 'photos';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      deal: {
        title,
        title_ne: f.title_ne?.trim() || null,
        description: f.description?.trim() || null,
        deal_discount_pct: pct,
        original_price: original,
        price,
      },
      schedules,
    },
  };
}

/** Back from rows to the editor: the days and the distinct clock windows. */
export function windowsToForm(rows: DealWindow[]): {
  days: number[];
  times: { start: string; end: string }[];
} {
  const days = [...new Set(rows.map((r) => r.day_of_week))].sort();
  const seen = new Set<string>();
  const times: { start: string; end: string }[] = [];
  for (const r of rows) {
    const k = `${r.start_time.slice(0, 5)}-${r.end_time.slice(0, 5)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    times.push({ start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) });
  }
  return { days, times };
}

/** Is a deal window live at `now` (Nepal time)? Mirrors is_deal_live() for the app. */
export function dealWindowLive(w: DealWindow, now: Date = new Date()): boolean {
  const p = nptParts(now);
  const t = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
  const s = w.start_time.slice(0, 5);
  const e = w.end_time.slice(0, 5);
  if (s < e) return w.day_of_week === p.weekday && t >= s && t < e;
  if (w.day_of_week === p.weekday && t >= s) return true;
  return w.day_of_week === (p.weekday + 6) % 7 && t < e;
}
