import { allowedAuthScreens, authStep, homeFor, resolveRoute, type GateInput } from '../gate';

const base: GateInput = {
  languageChosen: true,
  introSeen: true,
  signedIn: true,
  locationDone: true,
  role: 'customer',
  status: 'active',
};

describe('splash routing', () => {
  it('first launch goes to language, then intro once, then login', () => {
    expect(authStep({ ...base, languageChosen: false, introSeen: false, signedIn: false })).toBe(
      'language',
    );
    expect(authStep({ ...base, introSeen: false, signedIn: false })).toBe('intro');
    expect(authStep({ ...base, signedIn: false })).toBe('login');
  });

  it('customers pick a location before the app', () => {
    expect(authStep({ ...base, locationDone: false })).toBe('location');
    expect(authStep(base)).toBe('app');
  });

  it('login step allows login, OTP, business link and the email screens', () => {
    expect(allowedAuthScreens('login')).toEqual([
      'login',
      'otp',
      'business',
      'forgot-password',
      'check-email',
      'auth-callback',
    ]);
  });

  it('a password-reset link goes to "set a new password" first', () => {
    expect(authStep({ ...base, passwordRecovery: true })).toBe('reset-password');
  });
});

describe('role routing (T2.7)', () => {
  it('role -> home route', () => {
    expect(homeFor('customer')).toBe('/');
    expect(homeFor('vendor')).toBe('/vendor');
    expect(homeFor(null)).toBe('/');
  });

  it('customer lands on the customer home', () => {
    expect(resolveRoute(base, '(auth)', 'otp')).toBe('/');
    expect(resolveRoute(base, '(customer)', 'index')).toBeNull();
  });

  it('seeded vendor lands on vendor home (and skips the location step)', () => {
    const vendor = { ...base, role: 'vendor' as const, locationDone: false };
    expect(authStep(vendor)).toBe('app');
    expect(resolveRoute(vendor, '(auth)', 'otp')).toBe('/vendor');
    expect(resolveRoute(vendor, '(vendor)', 'vendor')).toBeNull();
  });

  it('guards: a customer cannot open vendor routes, a vendor cannot open customer routes', () => {
    expect(resolveRoute(base, '(vendor)', 'vendor')).toBe('/');
    const vendor = { ...base, role: 'vendor' as const };
    expect(resolveRoute(vendor, '(customer)', 'index')).toBe('/vendor');
    expect(resolveRoute(vendor, '(customer)', 'profile')).toBe('/vendor');
  });

  it('admins are not routed into the customer app', () => {
    const admin = { ...base, role: 'admin' as const };
    expect(authStep(admin)).toBe('admin-only');
    expect(resolveRoute(admin, '(customer)', 'index')).toBe('/admin-only');
    expect(resolveRoute(admin, '(auth)', 'admin-only')).toBeNull();
  });
});

describe('suspended and deleted users', () => {
  it('suspended user sees the blocked screen, whatever the role', () => {
    for (const role of ['customer', 'vendor', 'admin'] as const) {
      const s = { ...base, role, status: 'suspended' as const };
      expect(authStep(s)).toBe('blocked');
      expect(resolveRoute(s, '(customer)', 'index')).toBe('/blocked');
      expect(resolveRoute(s, '(auth)', 'blocked')).toBeNull();
    }
  });

  it('deleted is treated the same as suspended', () => {
    expect(authStep({ ...base, status: 'deleted' })).toBe('blocked');
  });

  it('a status change mid-session moves the user to the blocked screen', () => {
    const before = resolveRoute(base, '(customer)', 'profile');
    const after = resolveRoute({ ...base, status: 'suspended' }, '(customer)', 'profile');
    expect(before).toBeNull();
    expect(after).toBe('/blocked');
  });

  it('the blocked screen is only reachable while blocked', () => {
    expect(resolveRoute(base, '(auth)', 'blocked')).toBe('/');
  });

  it('system screens (update / maintenance) are never redirected', () => {
    expect(resolveRoute({ ...base, status: 'suspended' }, '(system)', 'update')).toBeNull();
  });
});

describe('after logout the OTP screen is not reused', () => {
  const loggedOut = { ...base, signedIn: false };

  it('a code just sent: the OTP screen stays', () => {
    expect(resolveRoute({ ...loggedOut, otpPending: true }, '(auth)', 'otp')).toBeNull();
  });

  it('no code sent in this attempt (stale history after logout): goes to login', () => {
    expect(resolveRoute(loggedOut, '(auth)', 'otp')).toBe('/login');
    expect(resolveRoute({ ...loggedOut, otpPending: false }, '(auth)', 'otp')).toBe('/login');
  });

  it('the login screen itself is untouched', () => {
    expect(resolveRoute(loggedOut, '(auth)', 'login')).toBeNull();
  });
});
