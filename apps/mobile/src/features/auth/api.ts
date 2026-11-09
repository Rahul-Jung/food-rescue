import { type ErrorCode, UNKNOWN_ERROR } from '@food-rescue/shared';
import { AuthError } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabase';
import type { Locale } from '../../store/language';

export type AuthChannel = 'phone' | 'email';

export interface AuthFailure {
  code: ErrorCode | typeof UNKNOWN_ERROR;
  /** The SMS could not be sent (gateway or hook down): offer email (C-04). */
  smsDown: boolean;
}

/** Maps Supabase Auth errors to the shared error codes; never shows raw text. */
export function toAuthFailure(error: unknown, channel: AuthChannel): AuthFailure {
  if (!(error instanceof AuthError)) return { code: UNKNOWN_ERROR, smsDown: false };
  const status = error.status ?? 0;
  const code = (error as AuthError & { code?: string }).code ?? '';
  const text = error.message ?? '';

  if (status === 429 || text === 'RATE_LIMITED' || code.startsWith('over_')) {
    return { code: 'RATE_LIMITED', smsDown: false };
  }
  if (code === 'otp_expired' || code === 'invalid_credentials' || status === 403) {
    return { code: 'CODE_INVALID', smsDown: false };
  }
  if (
    channel === 'phone' &&
    (status >= 500 || code === 'sms_send_failed' || code.startsWith('hook'))
  ) {
    return { code: UNKNOWN_ERROR, smsDown: true };
  }
  return { code: UNKNOWN_ERROR, smsDown: false };
}

/** Sends a 6-digit code. New users are created; locale goes to profiles.locale. */
export async function sendOtp(channel: AuthChannel, id: string, locale: Locale): Promise<void> {
  const { error } =
    channel === 'phone'
      ? await supabase.auth.signInWithOtp({ phone: id, options: { data: { locale } } })
      : await supabase.auth.signInWithOtp({
          email: id,
          options: { data: { locale }, shouldCreateUser: true },
        });
  if (error) throw toAuthFailure(error, channel);
}

export async function verifyOtp(channel: AuthChannel, id: string, token: string): Promise<void> {
  const { error } =
    channel === 'phone'
      ? await supabase.auth.verifyOtp({ phone: id, token, type: 'sms' })
      : await supabase.auth.verifyOtp({ email: id, token, type: 'email' });
  if (error) throw toAuthFailure(error, channel);
}

export function isAuthFailure(e: unknown): e is AuthFailure {
  return typeof e === 'object' && e !== null && 'code' in e && 'smsDown' in e;
}
