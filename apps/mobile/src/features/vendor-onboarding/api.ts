import { toAppError, toPointEwkt, type DayHours } from '@food-rescue/shared';

import { prepareImage } from '../../lib/images';
import { FULL_LONG_SIDE, FULL_MAX_BYTES, withRetry } from '../../lib/imageSizing';
import { supabase } from '../../lib/supabase';

// Vendor onboarding data (S3). The owner's own vendor row and hours are read
// and saved under RLS (plan section 8: vendor reads / updates own row; the
// column guard in 0009 keeps status, commission and strikes read-only).
// Status changes go through the named RPCs only.

export type VendorStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'suspended';
export type VendorType = 'restaurant' | 'grocery' | 'bakery' | 'cafe' | 'hotel' | 'other';

export interface MyVendor {
  id: string;
  name: string;
  type: VendorType;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  landmark: string | null;
  area: string | null;
  /** The pin (computed fields lat / lng; geography itself comes back as EWKB). */
  lat: number | null;
  lng: number | null;
  pan_vat_no: string | null;
  pan_doc_path: string | null;
  status: VendorStatus;
  reject_reason: string | null;
  pending_review: boolean;
}

/** The saved pin, or null when there is none yet. */
export function vendorPin(v: Pick<MyVendor, 'lat' | 'lng'> | null | undefined) {
  return v && typeof v.lat === 'number' && typeof v.lng === 'number'
    ? { lat: v.lat, lng: v.lng }
    : null;
}

export type VendorPatch = Partial<
  Pick<
    MyVendor,
    | 'name'
    | 'type'
    | 'description'
    | 'logo_url'
    | 'phone'
    | 'email'
    | 'address'
    | 'landmark'
    | 'area'
    | 'pan_vat_no'
    | 'pan_doc_path'
  >
> & { lat?: number; lng?: number };

const COLUMNS =
  'id, name, type, description, logo_url, phone, email, address, landmark, area, lat, lng, pan_vat_no, pan_doc_path, status, reject_reason, pending_review';

/** PostgreSQL unique_violation: the PAN is already registered to another business. */
export class PanTakenError extends Error {
  constructor() {
    super('PAN_TAKEN');
    this.name = 'PanTakenError';
  }
}

function toVendorError(err: { code?: string; message?: string } | null): Error {
  if (err?.code === '23505') return new PanTakenError();
  return toAppError(err);
}

/** The signed-in owner's vendor row, or null if there is none yet. */
export async function fetchMyVendor(userId: string): Promise<MyVendor | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select(COLUMNS)
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw toAppError(error);
  return (data as MyVendor | null) ?? null;
}

/** V-01: role vendor + draft vendor row (idempotent). Returns the vendor id. */
export async function startVendorSignup(): Promise<string> {
  const { data, error } = await supabase.rpc('start_vendor_signup');
  if (error) throw toAppError(error);
  return data as string;
}

/** Draft saving on each step (V-02 to V-04) and V-21 edits. */
export async function saveVendor(vendorId: string, patch: VendorPatch): Promise<MyVendor> {
  const { lat, lng, ...rest } = patch;
  const row: Record<string, unknown> = { ...rest };
  if (typeof lat === 'number' && typeof lng === 'number') row.location = toPointEwkt(lat, lng);
  const { data, error } = await supabase
    .from('vendors')
    .update(row)
    .eq('id', vendorId)
    .select(COLUMNS)
    .single();
  if (error) throw toVendorError(error);
  return data as MyVendor;
}

/**
 * V-04 / V-21: PAN photo to the private bucket at pan/{vendor_id}/{file}. A
 * new file name per upload, so a changed photo changes pan_doc_path (which
 * puts an approved vendor back in the admin queue).
 */
export async function uploadPanDoc(vendorId: string, sourceUri: string): Promise<string> {
  const image = await prepareImage(sourceUri, FULL_LONG_SIDE, FULL_MAX_BYTES);
  const path = `pan/${vendorId}/pan-${Date.now()}.webp`;
  await withRetry(async () => {
    const body = await (await fetch(image.uri)).arrayBuffer();
    const { error } = await supabase.storage
      .from('private-docs')
      .upload(path, body, { contentType: image.contentType, upsert: true });
    if (error) throw toAppError(error);
  });
  return path;
}

/** V-04 Submit / V-05 Resubmit. */
export async function submitApplication(): Promise<MyVendor> {
  const { data, error } = await supabase.rpc('submit_vendor_application');
  if (error) throw toAppError(error);
  return data as MyVendor;
}

export async function fetchHours(vendorId: string): Promise<DayHours[]> {
  const { data, error } = await supabase
    .from('vendor_hours')
    .select('day_of_week, opens, closes')
    .eq('vendor_id', vendorId)
    .order('day_of_week');
  if (error) throw toAppError(error);
  return ((data ?? []) as DayHours[]).map((h) => ({
    day_of_week: h.day_of_week,
    opens: h.opens.slice(0, 5),
    closes: h.closes.slice(0, 5),
  }));
}

/** V-21 hours editor: the week as a whole (closed days have no row). */
export async function saveHours(vendorId: string, week: DayHours[]): Promise<void> {
  const open = new Set(week.map((h) => h.day_of_week));
  const closed = [0, 1, 2, 3, 4, 5, 6].filter((d) => !open.has(d));
  if (closed.length > 0) {
    const del = await supabase
      .from('vendor_hours')
      .delete()
      .eq('vendor_id', vendorId)
      .in('day_of_week', closed);
    if (del.error) throw toAppError(del.error);
  }
  if (week.length > 0) {
    const up = await supabase
      .from('vendor_hours')
      .upsert(week.map((h) => ({ vendor_id: vendorId, ...h })));
    if (up.error) throw toAppError(up.error);
  }
}
