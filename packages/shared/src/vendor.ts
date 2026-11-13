import { z } from 'zod';

import { vendorTypeSchema } from './schemas';

// Vendor onboarding (S3): V-02 / V-03 / V-04 / V-21 field rules shared by the
// app and admin. The database repeats the important ones (0009, 0010).

export const VENDOR_NAME_MAX = 120;
export const VENDOR_DESCRIPTION_MAX = 2000;
export const VENDOR_ADDRESS_MAX = 200;
export const REJECT_REASON_MAX = 500;

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

/** Devanagari digits typed on a Nepali keyboard become 0-9. */
export function latinDigits(input: string): string {
  return input.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
}

/** Nepal PAN / VAT number: 9 digits. */
export const panSchema = z
  .string()
  .transform((s) => latinDigits(s).replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\d{9}$/));

/** Business contact phone: a Nepal mobile or a landline like 01-4XXXXXX. */
export function normaliseBusinessPhone(input: string): string | null {
  const s = latinDigits(input).replace(/[\s-]/g, '');
  let local = s;
  if (local.startsWith('+977')) local = local.slice(4);
  else if (local.startsWith('977') && local.length >= 11) local = local.slice(3);
  if (/^9[78]\d{8}$/.test(local)) return `+977${local}`;
  if (/^0?[1-9]\d{6,7}$/.test(local)) return `+977${local.replace(/^0/, '')}`;
  return null;
}

export const vendorProfileSchema = z.object({
  name: z.string().trim().min(2).max(VENDOR_NAME_MAX),
  type: vendorTypeSchema,
  description: z.string().trim().max(VENDOR_DESCRIPTION_MAX).optional().default(''),
  phone: z.string().transform((s, ctx) => {
    const p = normaliseBusinessPhone(s);
    if (!p) {
      ctx.addIssue({ code: 'custom', message: 'phone' });
      return z.NEVER;
    }
    return p;
  }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.union([z.literal(''), z.email().max(254)]))
    .optional()
    .default(''),
});
export type VendorProfileInput = z.input<typeof vendorProfileSchema>;

export const vendorLocationSchema = z.object({
  address: z.string().trim().min(3).max(VENDOR_ADDRESS_MAX),
  landmark: z.string().trim().max(VENDOR_ADDRESS_MAX).optional().default(''),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const rejectReasonSchema = z.string().trim().min(3).max(REJECT_REASON_MAX);

/** PostGIS EWKT for a geography(Point) column: lng first. */
export function toPointEwkt(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

/** Reads a point back from GeoJSON (PostgREST returns geography as GeoJSON). */
export function fromPoint(value: unknown): { lat: number; lng: number } | null {
  if (!value || typeof value !== 'object') return null;
  const c = (value as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(c) || typeof c[0] !== 'number' || typeof c[1] !== 'number') return null;
  return { lng: c[0], lat: c[1] };
}

interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

function isPolygon(v: unknown): v is GeoPolygon {
  return (
    !!v &&
    typeof v === 'object' &&
    (v as { type?: unknown }).type === 'Polygon' &&
    Array.isArray((v as { coordinates?: unknown }).coordinates)
  );
}

/**
 * V-03 pilot-area warning: is the pin inside the pilot polygon
 * (app_settings.pilot_polygon, GeoJSON)? Ray casting on the outer ring.
 * Unknown or bad polygon = no warning.
 */
export function insidePilotArea(lat: number, lng: number, polygon: unknown): boolean {
  if (!isPolygon(polygon)) return true;
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 4) return true;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Fields submit_vendor_application requires (mirror of vendor_missing_fields in 0010). */
export interface VendorDraftFields {
  name?: string | null;
  type?: string | null;
  phone?: string | null;
  address?: string | null;
  location?: unknown;
  pan_vat_no?: string | null;
  pan_doc_path?: string | null;
}

export type VendorField =
  | 'name'
  | 'type'
  | 'phone'
  | 'address'
  | 'location'
  | 'pan_vat_no'
  | 'pan_doc_path';

export function missingVendorFields(v: VendorDraftFields): VendorField[] {
  const blank = (s: string | null | undefined) => !s || s.trim() === '';
  const out: VendorField[] = [];
  if (blank(v.name)) out.push('name');
  if (blank(v.type)) out.push('type');
  if (blank(v.phone)) out.push('phone');
  if (blank(v.address)) out.push('address');
  if (v.location === null || v.location === undefined) out.push('location');
  if (blank(v.pan_vat_no)) out.push('pan_vat_no');
  if (blank(v.pan_doc_path)) out.push('pan_doc_path');
  return out;
}

// Opening hours (V-21) --------------------------------------------------------

/** "9:00", "09:00" or "0900" -> "09:00"; null when not a time of day. */
export function normaliseTime(input: string): string | null {
  const s = latinDigits(input).trim();
  const m = /^(\d{1,2}):?(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export interface DayHours {
  /** 0 = Sunday … 6 = Saturday (Postgres extract(dow)). */
  day_of_week: number;
  opens: string;
  closes: string;
}

/** Opens and closes must differ; closes before opens means past midnight. */
export function validDayHours(h: DayHours): boolean {
  const o = normaliseTime(h.opens);
  const c = normaliseTime(h.closes);
  return h.day_of_week >= 0 && h.day_of_week <= 6 && !!o && !!c && o !== c;
}

// Admin AD-03 (T3.6) --------------------------------------------------------------

export interface VendorFlagInput {
  id: string;
  pan_vat_no: string | null;
  phone: string | null;
}

/** Vendors whose PAN or phone also appears on another vendor (AD-03 flag). */
export function duplicateFlags(
  rows: VendorFlagInput[],
): Map<string, { pan: boolean; phone: boolean }> {
  const norm = (s: string | null) => (s ? latinDigits(s).replace(/[\s-]/g, '') : '');
  const count = (key: (r: VendorFlagInput) => string) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = key(r);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const pans = count((r) => norm(r.pan_vat_no));
  const phones = count((r) => norm(r.phone));
  const out = new Map<string, { pan: boolean; phone: boolean }>();
  for (const r of rows) {
    out.set(r.id, {
      pan: (pans.get(norm(r.pan_vat_no)) ?? 0) > 1,
      phone: (phones.get(norm(r.phone)) ?? 0) > 1,
    });
  }
  return out;
}
