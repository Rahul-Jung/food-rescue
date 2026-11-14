/**
 * AD-01: an admin's TOTP enrolment that is waiting for its first code.
 *
 * Auth only returns the QR code and secret when the factor is created, so the
 * admin panel keeps them for a short time. A page reload then shows the same
 * QR code instead of replacing a factor the admin has already scanned.
 */
export type PendingEnrolment = {
  userId: string;
  factorId: string;
  qr: string;
  secret: string;
  /** Unix seconds. */
  createdAt: number;
};

/** How long a scanned-but-unconfirmed QR code is reused. */
export const PENDING_ENROLMENT_MINUTES = 10;

/** Reads a stored value; anything malformed counts as nothing stored. */
export function parsePendingEnrolment(raw: string | null | undefined): PendingEnrolment | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.userId !== 'string' ||
    typeof v.factorId !== 'string' ||
    typeof v.qr !== 'string' ||
    typeof v.secret !== 'string' ||
    typeof v.createdAt !== 'number'
  ) {
    return null;
  }
  return {
    userId: v.userId,
    factorId: v.factorId,
    qr: v.qr,
    secret: v.secret,
    createdAt: v.createdAt,
  };
}

/**
 * Reuse the stored enrolment only for the same user, while it is fresh, and
 * while Auth still has that factor unverified.
 */
export function reusablePendingEnrolment(
  pending: PendingEnrolment | null,
  input: {
    userId: string;
    factors: readonly { id: string; status: string }[];
    now: number;
  },
): PendingEnrolment | null {
  if (!pending || pending.userId !== input.userId) return null;
  const age = input.now - pending.createdAt;
  if (age < 0 || age > PENDING_ENROLMENT_MINUTES * 60) return null;
  const factor = input.factors.find((f) => f.id === pending.factorId);
  if (!factor || factor.status === 'verified') return null;
  return pending;
}
