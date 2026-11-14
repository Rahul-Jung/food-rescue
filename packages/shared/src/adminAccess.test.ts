import { ADMIN_SESSION_HOURS, decideAdminAccess, passwordSignInTime } from './adminAccess';

const now = 1_800_000_000;
const admin = {
  signedIn: true,
  role: 'admin',
  status: 'active',
  aal: 'aal2',
  signedInAt: now - 600,
  now,
};

describe('admin panel access (AD-01: TOTP required, 12-hour session)', () => {
  it('no session -> login', () => {
    expect(decideAdminAccess({ signedIn: false, now })).toEqual({
      allow: false,
      redirect: '/login',
      signOut: false,
      reason: 'no_session',
    });
  });

  it('a customer or vendor is signed out and sent to login', () => {
    for (const role of ['customer', 'vendor', null]) {
      expect(decideAdminAccess({ ...admin, role })).toMatchObject({
        allow: false,
        redirect: '/login',
        signOut: true,
        reason: 'not_admin',
      });
    }
  });

  it('admin without TOTP (aal1) cannot open any page', () => {
    expect(decideAdminAccess({ ...admin, aal: 'aal1' })).toEqual({
      allow: false,
      redirect: '/login/mfa',
      signOut: false,
      reason: 'needs_totp',
    });
  });

  it('admin with TOTP (aal2) is let in', () => {
    expect(decideAdminAccess(admin)).toEqual({ allow: true });
  });

  it('session older than 12 hours ends', () => {
    const old = { ...admin, signedInAt: now - ADMIN_SESSION_HOURS * 3600 - 1 };
    expect(decideAdminAccess(old)).toMatchObject({
      allow: false,
      reason: 'expired',
      signOut: true,
    });
    const edge = { ...admin, signedInAt: now - ADMIN_SESSION_HOURS * 3600 };
    expect(decideAdminAccess(edge)).toEqual({ allow: true });
  });

  it('suspended admin is signed out', () => {
    expect(decideAdminAccess({ ...admin, status: 'suspended' })).toMatchObject({
      reason: 'blocked',
      signOut: true,
    });
  });

  it('missing sign-in time is treated as expired (fail closed)', () => {
    expect(decideAdminAccess({ ...admin, signedInAt: null })).toMatchObject({ reason: 'expired' });
  });
});

describe('password sign-in time from the JWT amr claim', () => {
  it('uses the password entry, not the later TOTP one', () => {
    expect(
      passwordSignInTime([
        { method: 'totp', timestamp: 1_800_000_500 },
        { method: 'password', timestamp: 1_800_000_000 },
      ]),
    ).toBe(1_800_000_000);
  });

  it('returns null without a password entry', () => {
    expect(passwordSignInTime([{ method: 'otp', timestamp: 5 }])).toBeNull();
    expect(passwordSignInTime(undefined)).toBeNull();
  });
});
