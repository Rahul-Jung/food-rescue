// OTP SMS text. Kept short: English fits one GSM segment (160 chars) and
// Nepali (Unicode) fits one 70-character segment, so each OTP costs one SMS.

export type SmsLocale = 'en' | 'ne';

export function buildOtpMessage(code: string, locale: SmsLocale = 'en'): string {
  if (!/^\d{6}$/.test(code)) throw new Error('OTP must be 6 digits');
  if (locale === 'ne') {
    // Digits stay Latin so the phone can autofill the code.
    return `फुड रेस्क्यु कोड: ${code}। यो कोड कसैलाई नदिनुहोस्।`;
  }
  return `Food Rescue code: ${code}. Do not share this code with anyone.`;
}

/** Locale from the user's sign-up metadata; English unless it is exactly 'ne'. */
export function smsLocale(userMetadata: unknown): SmsLocale {
  const locale = (userMetadata as { locale?: unknown } | null)?.locale;
  return locale === 'ne' ? 'ne' : 'en';
}

/** Supabase Auth sends phones without '+'; store and send E.164. */
export function toE164(phone: string): string {
  const p = phone.trim();
  return p.startsWith('+') ? p : `+${p}`;
}

/**
 * Who gets the SMS. Auth names the destination in `sms.phone`; for a phone
 * change (C-24) that is the new number, while `user.phone` is still the old
 * one (`user.new_phone` also holds the new one). The code must go to the new one.
 */
export function smsRecipient(
  sms: { phone?: string },
  user: { phone?: string; new_phone?: string },
): string {
  const target = [sms.phone, user.new_phone, user.phone].find((p) => p?.trim());
  return toE164(target ?? '');
}

/** For logs: +97798****5678 (never log a full number). */
export function maskPhone(phone: string): string {
  return phone.replace(/^(\+?\d{5})\d+(\d{4})$/, '$1****$2');
}
