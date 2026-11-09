// Login rules shared by the app (C-03 / C-04). Plan: "+977 98XXXXXXXX format
// check"; "resend after 30 s (max 3 per 15 min); 5 wrong = 15 min lock".
// The resend gap is read from app_settings.otp_resend_seconds by the app; the
// 3-per-15-min send limit is enforced on the server by sms-hook (T2.3).

/** Wrong codes allowed before the lock (C-04). */
export const OTP_MAX_WRONG = 5;
/** Lock length after OTP_MAX_WRONG wrong codes (C-04). */
export const OTP_LOCK_MINUTES = 15;

const NP_MOBILE = /^9[78]\d{8}$/;

/**
 * Turns what the user typed after the fixed "+977" prefix into E.164, or
 * null when it is not a Nepal mobile (98XXXXXXXX / 97XXXXXXXX). Spaces,
 * dashes, a leading 0, "977" or "+977" are tolerated.
 */
export function toNpMobileE164(input: string): string | null {
  let digits = input.replace(/[\s-]/g, '');
  if (digits.startsWith('+977')) digits = digits.slice(4);
  else if (digits.startsWith('977') && digits.length === 13) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return NP_MOBILE.test(digits) ? `+977${digits}` : null;
}

/** "+977 98XXXXXXXX" style for showing a number back to the user. */
export function formatNpMobile(e164: string): string {
  return e164.replace(/^\+977(\d{10})$/, '+977 $1');
}

export interface OtpLockState {
  wrong: number;
  /** Epoch ms; null when not locked. */
  lockedUntil: number | null;
}

export const OTP_LOCK_EMPTY: OtpLockState = { wrong: 0, lockedUntil: null };

export function isOtpLocked(state: OtpLockState, now: number): boolean {
  return state.lockedUntil !== null && now < state.lockedUntil;
}

/** Seconds left on the lock (0 when not locked). */
export function otpLockSecondsLeft(state: OtpLockState, now: number): number {
  return isOtpLocked(state, now) ? Math.ceil((state.lockedUntil! - now) / 1000) : 0;
}

/** Records one wrong code; the 5th wrong code starts a 15-minute lock. */
export function registerWrongOtp(state: OtpLockState, now: number): OtpLockState {
  // An expired lock starts a fresh count.
  const base = state.lockedUntil !== null && now >= state.lockedUntil ? OTP_LOCK_EMPTY : state;
  const wrong = base.wrong + 1;
  if (wrong >= OTP_MAX_WRONG) {
    return { wrong, lockedUntil: now + OTP_LOCK_MINUTES * 60_000 };
  }
  return { wrong, lockedUntil: null };
}

/** Seconds until another code may be requested (0 = can resend now). */
export function resendSecondsLeft(
  lastSentAt: number | null,
  now: number,
  resendSeconds: number,
): number {
  if (lastSentAt === null) return 0;
  const left = Math.ceil((lastSentAt + resendSeconds * 1000 - now) / 1000);
  return Math.max(0, left);
}
