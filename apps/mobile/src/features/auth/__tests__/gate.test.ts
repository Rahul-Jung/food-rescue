import { allowedAuthScreens, authStep } from '../gate';

const base = { languageChosen: true, introSeen: true, signedIn: true, locationDone: true };

describe('splash routing', () => {
  it('first launch goes to language', () => {
    expect(authStep({ ...base, languageChosen: false, introSeen: false, signedIn: false })).toBe(
      'language',
    );
  });

  it('then the intro, once', () => {
    expect(authStep({ ...base, introSeen: false, signedIn: false })).toBe('intro');
  });

  it('then login when signed out', () => {
    expect(authStep({ ...base, signedIn: false })).toBe('login');
  });

  it('then location after signing in', () => {
    expect(authStep({ ...base, locationDone: false })).toBe('location');
  });

  it('then the app', () => {
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
    expect(allowedAuthScreens('location')).toEqual(['location']);
  });

  it('a password-reset link goes to "set a new password" first', () => {
    expect(authStep({ ...base, passwordRecovery: true })).toBe('reset-password');
    expect(authStep({ ...base, locationDone: false, passwordRecovery: true })).toBe(
      'reset-password',
    );
    expect(allowedAuthScreens('reset-password')).toEqual(['reset-password']);
  });

  it('a restored session skips login', () => {
    expect(authStep({ ...base, signedIn: true })).toBe('app');
  });
});
