import { toDigits, type Digits, type Locale } from './digits';
import { NPT_OFFSET_MINUTES, nptParts } from './time';

// Customer discovery helpers (S5: C-06 home, C-07 map, C-08 search).

/** "0.6 km" (plan section 9); always km with one decimal, user's digits. */
export function formatDistance(
  metres: number,
  locale: Locale = 'en',
  digits: Digits = 'latin',
): string {
  const km = Math.max(0, metres) / 1000;
  const text = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return `${toDigits(text, digits)} ${locale === 'ne' ? 'कि.मि.' : 'km'}`;
}

export type SortKey = 'distance' | 'price' | 'discount' | 'ending';
export const SORT_KEYS: SortKey[] = ['distance', 'price', 'discount', 'ending'];

/** Rupees typed in a price box to paisa; '' = no limit; null = not a number. */
export function priceBoxToPaisa(text: string): number | null | undefined {
  const t = text.trim();
  if (t === '') return undefined;
  if (!/^\d{1,6}$/.test(t)) return null;
  return Number(t) * 100;
}

/** C-08: min above max is the "conflicting range" inline error. */
export function priceRangeError(minPaisa?: number | null, maxPaisa?: number | null): boolean {
  return minPaisa != null && maxPaisa != null && minPaisa > maxPaisa;
}

/**
 * C-08 "pickup time": "HH:MM" today in Nepal as an instant, for
 * nearby_offers(p_pickup_after). Empty = no filter.
 */
export function pickupAfterToday(hhmm: string, now: Date = new Date()): string | undefined {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return undefined;
  const p = nptParts(now);
  const utc =
    Date.UTC(p.year, p.month - 1, p.day, Number(m[1]), Number(m[2])) - NPT_OFFSET_MINUTES * 60_000;
  return new Date(utc).toISOString();
}

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface Cluster<T extends MapPoint> {
  key: string;
  lat: number;
  lng: number;
  items: T[];
}

/**
 * C-07 clustering without a native module: points falling in the same grid
 * cell (the visible span split into `cells` columns) merge into one pin.
 * Zoomed in far enough (cell under ~40 m) every point stays separate.
 */
export function clusterPoints<T extends MapPoint>(
  points: T[],
  span: { latitudeDelta: number; longitudeDelta: number },
  cells = 8,
): Cluster<T>[] {
  const cellLat = span.latitudeDelta / cells;
  const cellLng = span.longitudeDelta / cells;
  if (cellLat < 0.0004) {
    return points.map((p) => ({ key: p.id, lat: p.lat, lng: p.lng, items: [p] }));
  }
  const groups = new Map<string, T[]>();
  for (const p of points) {
    const k = `${Math.floor(p.lat / cellLat)}:${Math.floor(p.lng / cellLng)}`;
    const g = groups.get(k);
    if (g) g.push(p);
    else groups.set(k, [p]);
  }
  return [...groups.entries()].map(([k, items]) => ({
    key: items.length === 1 ? (items[0] as T).id : `c:${k}`,
    lat: items.reduce((s, p) => s + p.lat, 0) / items.length,
    lng: items.reduce((s, p) => s + p.lng, 0) / items.length,
    items,
  }));
}
