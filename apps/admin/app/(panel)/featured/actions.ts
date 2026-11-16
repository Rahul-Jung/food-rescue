'use server';

import { clockFrom12h } from '@food-rescue/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { supabaseServer } from '@/lib/supabase';

// AD-10 actions. admin_set_featured checks the caller (admin with TOTP) and
// writes audit_log with before / after.

function back(msg: string): never {
  revalidatePath('/featured');
  redirect(`/featured?msg=${encodeURIComponent(msg)}`);
}

function errorText(message: string | undefined): string {
  const code = (message ?? '').trim();
  if (code === 'FORBIDDEN') return '⚠ Not allowed (admin with TOTP only).';
  if (code === 'VALIDATION_FAILED')
    return '⚠ Check the vendor, the dates (end after start) and the amount.';
  return '⚠ Something went wrong. Please try again.';
}

/** A Nepal date ("2026-11-20") plus a 12-hour time from the pickers, as an ISO instant. */
export async function nptInstant(
  date: string,
  hour: string,
  minute: string,
  ampm: string,
): Promise<string | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isInteger(h) || h < 1 || h > 12 || !Number.isInteger(m) || m < 0 || m > 59)
    return null;
  return `${date}T${clockFrom12h(h, m, ampm === 'PM')}:00+05:45`;
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim();
}

export async function addFeatured(formData: FormData) {
  const vendorId = field(formData, 'vendor_id');
  const start = await nptInstant(
    field(formData, 'start_date'),
    field(formData, 'start_hour'),
    field(formData, 'start_minute'),
    field(formData, 'start_ampm'),
  );
  const end = await nptInstant(
    field(formData, 'end_date'),
    field(formData, 'end_hour'),
    field(formData, 'end_minute'),
    field(formData, 'end_ampm'),
  );
  const rupees = Number(field(formData, 'amount').replace(/,/g, ''));
  const note = field(formData, 'note');
  if (!vendorId) back('⚠ Pick a vendor.');
  if (!start || !end) back('⚠ Pick a start and an end date and time.');
  if (new Date(end!).getTime() <= new Date(start!).getTime())
    back('⚠ The end must be after the start.');
  if (!Number.isFinite(rupees) || rupees < 0 || !Number.isInteger(rupees)) {
    back('⚠ Amount paid must be whole rupees (0 or more).');
  }
  if (note.length > 500) back('⚠ The note can be at most 500 characters.');

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('admin_set_featured', {
    p_vendor_id: vendorId,
    p_starts_at: start!,
    p_ends_at: end!,
    p_amount_paid: rupees * 100,
    p_note: note || undefined,
  });
  back(error ? errorText(error.message) : '✓ Featured slot added. It ends by itself.');
}

export async function endFeatured(formData: FormData) {
  const slotId = field(formData, 'slot_id');
  const supabase = await supabaseServer();
  const { data: slot } = await supabase
    .from('featured_slots')
    .select('vendor_id, starts_at, amount_paid, note')
    .eq('id', slotId)
    .maybeSingle();
  if (!slot) back('⚠ That slot was not found.');
  const now = new Date();
  // A slot that has not started yet ends one second after its start.
  const starts = new Date(slot!.starts_at);
  const ends = now > starts ? now : new Date(starts.getTime() + 1000);
  const { error } = await supabase.rpc('admin_set_featured', {
    p_vendor_id: slot!.vendor_id,
    p_starts_at: slot!.starts_at,
    p_ends_at: ends.toISOString(),
    p_amount_paid: slot!.amount_paid,
    p_note: slot!.note ?? undefined,
    p_slot_id: slotId,
  });
  back(error ? errorText(error.message) : '✓ Slot ended. The vendor is no longer featured.');
}
