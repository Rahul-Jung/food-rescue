import { type ErrorCode, UNKNOWN_ERROR } from '@food-rescue/shared';
import { AuthError } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabase';
import type { Locale } from '../../store/language';

export type AuthChannel = 'phone' | 'email';
/** Where an error came from: an OTP channel, or email + password. */
export type AuthSource = AuthChannel | 'password';

/** Deep links Supabase Auth sends users back to (allowed in auth.additional_redirect_urls). */
export const AUTH_CALLBACK_URL = 'foodrescue://auth-callback';
export const PASSWORD_RESET_URL = 'foodrescue://reset-password';

export interface AuthFailure {
  code: ErrorCode | typeof UNKNOWN_ERROR;
  /** The SMS could not be sent (gateway or hook down): offer email (C-04). */
  smsDown: boolean;
}

/** Maps Supabase Auth errors to the shared error codes; never shows raw text. */
export function toAuthFailure(error: unknown, channel: AuthSource): AuthFailure {
  if (!(error instanceof AuthError)) return { code: UNKNOWN_ERROR, smsDown: false };
  const status = error.status ?? 0;
  const code = (error as AuthError & { code?: string }).code ?? '';
  const text = error.message ?? '';

  if (status === 429 || text === 'RATE_LIMITED' || code.startsWith('over_')) {
    return { code: 'RATE_LIMITED', smsDown: false };
  }
  if (code === 'email_not_confirmed') return { code: 'EMAIL_NOT_CONFIRMED', smsDown: false };
  if (channel === 'password' && code === 'invalid_credentials') {
    return { code: 'INVALID_CREDENTIALS', smsDown: false };
  }
  if (code === 'weak_password' || code === 'validation_failed') {
    return { code: 'VALIDATION_FAILED', smsDown: false };
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

/**
 * Email + password sign-up. Auth sends a confirmation email whose link opens
 * the app (AUTH_CALLBACK_URL); sign-in is refused until it is confirmed.
 * If the email is already registered, Auth answers the same way (no hint
 * whether an account exists).
 */
export async function signUpWithPassword(email: string, password: string, locale: Locale) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { locale }, emailRedirectTo: AUTH_CALLBACK_URL },
  });
  if (error) throw toAuthFailure(error, 'password');
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw toAuthFailure(error, 'password');
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: AUTH_CALLBACK_URL },
  });
  if (error) throw toAuthFailure(error, 'password');
}

/** Sends the "set a new password" email; its link opens PASSWORD_RESET_URL. */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: PASSWORD_RESET_URL,
  });
  if (error) throw toAuthFailure(error, 'password');
}

/**
 * Code from the confirm / reset email (works in any email app, no link
 * needed). 'signup' confirms the email and signs in; 'recovery' signs in for
 * setting a new password.
 */
export async function verifyEmailCode(
  email: string,
  token: string,
  type: 'signup' | 'recovery',
): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type });
  if (error) throw toAuthFailure(error, 'email');
}

/** Sets a new password for the signed-in (recovery) session. */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toAuthFailure(error, 'password');
}

export function isAuthFailure(e: unknown): e is AuthFailure {
  return typeof e === 'object' && e !== null && 'code' in e && 'smsDown' in e;
}
