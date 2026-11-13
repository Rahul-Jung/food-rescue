'use server';

import { rejectReasonSchema } from '@food-rescue/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { supabaseServer } from '@/lib/supabase';

// AD-04 actions. Each calls an admin_* RPC with the admin's own JWT (aal2);
// the RPC checks the caller and writes audit_log with before / after.

function back(id: string, msg: string): never {
  revalidatePath('/vendors');
  revalidatePath(`/vendors/${id}`);
  redirect(`/vendors/${id}?msg=${encodeURIComponent(msg)}`);
}

function errorText(message: string | undefined): string {
  const code = (message ?? '').trim();
  if (code === 'FORBIDDEN') return '⚠ Not allowed (admin with TOTP only).';
  if (code === 'VALIDATION_FAILED') return '⚠ Not allowed in this state, or a value is invalid.';
  return '⚠ Something went wrong. Please try again.';
}

export async function approveVendor(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('admin_approve_vendor', { p_vendor_id: id });
  back(id, error ? errorText(error.message) : '✓ Approved. The vendor gets a push and an email.');
}

export async function rejectVendor(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const reason = rejectReasonSchema.safeParse(formData.get('reason') ?? '');
  if (!reason.success) back(id, '⚠ Write a reason (3 to 500 characters).');
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('admin_reject_vendor', {
    p_vendor_id: id,
    p_reason: reason.data,
  });
  back(id, error ? errorText(error.message) : '✓ Rejected. The vendor sees the reason.');
}

export async function suspendOwner(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const ownerId = String(formData.get('owner_id') ?? '');
  const reason = rejectReasonSchema.safeParse(formData.get('reason') ?? '');
  if (!reason.success) back(id, '⚠ Write a reason (3 to 500 characters).');
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('admin_suspend_user', {
    p_user_id: ownerId,
    p_reason: reason.data,
  });
  back(id, error ? errorText(error.message) : '✓ Suspended. The vendor is hidden and logged out.');
}

export async function setCommission(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const percent = Number(String(formData.get('percent') ?? '').replace(',', '.'));
  const freeUntil = String(formData.get('free_until') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  const rateBp = Math.round(percent * 100);
  if (!Number.isFinite(percent) || rateBp < 0 || rateBp > 5000) {
    back(id, '⚠ Commission must be between 0 and 50%.');
  }
  // The date is a Nepal calendar day: free until the end of that day in NPT.
  let freeUntilIso: string | null = null;
  if (freeUntil) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(freeUntil)) back(id, '⚠ Pick a valid date.');
    freeUntilIso = `${freeUntil}T23:59:59+05:45`;
  }
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('admin_set_commission', {
    p_vendor_id: id,
    p_rate_bp: rateBp,
    p_free_until: freeUntilIso,
    p_reason: reason || null,
  });
  back(id, error ? errorText(error.message) : '✓ Commission saved.');
}
