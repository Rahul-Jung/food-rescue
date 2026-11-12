import { toAppError } from '@food-rescue/shared';

import { supabase } from '../../lib/supabase';
import { toAuthFailure } from '../auth/api';

export interface MyProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  locale: 'en' | 'ne';
  radius_m: number;
  pickup_reminders: boolean;
  marketing_pushes: boolean;
  devanagari_digits: boolean;
}

/** Fields the user may change themselves (update_my_profile). */
export type ProfilePatch = Partial<
  Pick<
    MyProfile,
    | 'full_name'
    | 'locale'
    | 'radius_m'
    | 'pickup_reminders'
    | 'marketing_pushes'
    | 'devanagari_digits'
  >
>;

const COLUMNS =
  'id, full_name, phone, email, locale, radius_m, pickup_reminders, marketing_pushes, devanagari_digits';

/** Own profile (RLS shows only the user's own row). */
export async function fetchMyProfile(userId: string): Promise<MyProfile> {
  const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', userId).single();
  if (error) throw toAppError(error);
  return data as MyProfile;
}

/** Saves through the update_my_profile RPC (never a direct table write). */
export async function updateMyProfile(patch: ProfilePatch): Promise<MyProfile> {
  const { data, error } = await supabase.rpc('update_my_profile', {
    p_full_name: patch.full_name ?? undefined,
    p_locale: patch.locale ?? undefined,
    p_radius_m: patch.radius_m ?? undefined,
    p_pickup_reminders: patch.pickup_reminders ?? undefined,
    p_marketing_pushes: patch.marketing_pushes ?? undefined,
    p_devanagari_digits: patch.devanagari_digits ?? undefined,
  });
  if (error) throw toAppError(error);
  return data as MyProfile;
}

/** C-24: asks Auth to text a code to the new number (via sms-hook). */
export async function startPhoneChange(newPhoneE164: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ phone: newPhoneE164 });
  if (error) throw toAuthFailure(error, 'phone');
}

/** C-24: the code from the new number confirms the change (profile follows by trigger). */
export async function confirmPhoneChange(newPhoneE164: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    phone: newPhoneE164,
    token,
    type: 'phone_change',
  });
  if (error) throw toAuthFailure(error, 'phone');
}
