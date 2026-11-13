import {
  PENDING_ENROLMENT_MINUTES,
  parsePendingEnrolment,
  reusablePendingEnrolment,
  type PendingEnrolment,
} from './mfaEnrolment';

const now = 1_800_000_000;
const pending: PendingEnrolment = {
  userId: 'admin-1',
  factorId: 'factor-1',
  qr: 'data:image/svg+xml;utf-8,<svg/>',
  secret: 'ABCDEF',
  createdAt: now - 60,
};
const unverified = [{ id: 'factor-1', status: 'unverified' }];

describe('pending TOTP enrolment (a reload keeps the scanned QR code)', () => {
  it('reuses the same QR code for the same admin while the factor is unverified', () => {
    expect(
      reusablePendingEnrolment(pending, { userId: 'admin-1', factors: unverified, now }),
    ).toEqual(pending);
  });

  it('starts again when nothing is stored', () => {
    expect(
      reusablePendingEnrolment(null, { userId: 'admin-1', factors: unverified, now }),
    ).toBeNull();
  });

  it('starts again after 10 minutes', () => {
    const edge = { ...pending, createdAt: now - PENDING_ENROLMENT_MINUTES * 60 };
    expect(reusablePendingEnrolment(edge, { userId: 'admin-1', factors: unverified, now })).toEqual(
      edge,
    );
    const old = { ...pending, createdAt: edge.createdAt - 1 };
    expect(
      reusablePendingEnrolment(old, { userId: 'admin-1', factors: unverified, now }),
    ).toBeNull();
  });

  it('never reuses another user’s enrolment', () => {
    expect(
      reusablePendingEnrolment(pending, { userId: 'admin-2', factors: unverified, now }),
    ).toBeNull();
  });

  it('starts again when Auth no longer has the factor, or it is already verified', () => {
    expect(reusablePendingEnrolment(pending, { userId: 'admin-1', factors: [], now })).toBeNull();
    expect(
      reusablePendingEnrolment(pending, {
        userId: 'admin-1',
        factors: [{ id: 'factor-1', status: 'verified' }],
        now,
      }),
    ).toBeNull();
  });

  it('ignores a time in the future', () => {
    const future = { ...pending, createdAt: now + 5 };
    expect(
      reusablePendingEnrolment(future, { userId: 'admin-1', factors: unverified, now }),
    ).toBeNull();
  });
});

describe('reading the stored enrolment', () => {
  it('round-trips a valid value', () => {
    expect(parsePendingEnrolment(JSON.stringify(pending))).toEqual(pending);
  });

  it('treats missing, broken or incomplete values as nothing stored', () => {
    expect(parsePendingEnrolment(null)).toBeNull();
    expect(parsePendingEnrolment('')).toBeNull();
    expect(parsePendingEnrolment('{not json')).toBeNull();
    expect(parsePendingEnrolment('42')).toBeNull();
    expect(parsePendingEnrolment(JSON.stringify({ ...pending, createdAt: 'x' }))).toBeNull();
    expect(parsePendingEnrolment(JSON.stringify({ ...pending, secret: undefined }))).toBeNull();
  });
});
