import {
  formatNpMobile,
  isOtpLocked,
  OTP_LOCK_EMPTY,
  otpLockSecondsLeft,
  registerWrongOtp,
  resendSecondsLeft,
  toNpMobileE164,
  type OtpLockState,
} from './auth';

describe('Nepal mobile format check (+977 98XXXXXXXX)', () => {
  it('accepts 98 / 97 numbers and returns E.164', () => {
    expect(toNpMobileE164('9812345678')).toBe('+9779812345678');
    expect(toNpMobileE164('9712345678')).toBe('+9779712345678');
  });

  it('tolerates spaces, dashes, a leading 0 and the country code', () => {
    expect(toNpMobileE164('981 234 5678')).toBe('+9779812345678');
    expect(toNpMobileE164('981-234-5678')).toBe('+9779812345678');
    expect(toNpMobileE164('09812345678')).toBe('+9779812345678');
    expect(toNpMobileE164('+977 9812345678')).toBe('+9779812345678');
    expect(toNpMobileE164('9779812345678')).toBe('+9779812345678');
  });

  it('rejects anything that is not a Nepal mobile', () => {
    expect(toNpMobileE164('981234567')).toBeNull(); // 9 digits
    expect(toNpMobileE164('98123456789')).toBeNull(); // 11 digits
    expect(toNpMobileE164('9612345678')).toBeNull(); // not 98 / 97
    expect(toNpMobileE164('014412345')).toBeNull(); // landline
    expect(toNpMobileE164('98123abc78')).toBeNull();
    expect(toNpMobileE164('')).toBeNull();
  });

  it('formats for display', () => {
    expect(formatNpMobile('+9779812345678')).toBe('+977 9812345678');
  });
});

describe('OTP lock: 5 wrong = 15 min lock', () => {
  const t0 = Date.parse('2026-11-09T10:00:00Z');

  function wrongTimes(n: number, at = t0): OtpLockState {
    let s = OTP_LOCK_EMPTY;
    for (let i = 0; i < n; i++) s = registerWrongOtp(s, at);
    return s;
  }

  it('4 wrong codes do not lock', () => {
    const s = wrongTimes(4);
    expect(s.wrong).toBe(4);
    expect(isOtpLocked(s, t0)).toBe(false);
  });

  it('the 5th wrong code locks for 15 minutes', () => {
    const s = wrongTimes(5);
    expect(isOtpLocked(s, t0)).toBe(true);
    expect(otpLockSecondsLeft(s, t0)).toBe(15 * 60);
    expect(isOtpLocked(s, t0 + 14 * 60_000 + 59_000)).toBe(true);
  });

  it('unlocks after 15 minutes', () => {
    const s = wrongTimes(5);
    expect(isOtpLocked(s, t0 + 15 * 60_000)).toBe(false);
    expect(otpLockSecondsLeft(s, t0 + 15 * 60_000)).toBe(0);
  });

  it('after the lock ends, counting starts again from zero', () => {
    const after = t0 + 16 * 60_000;
    const s = registerWrongOtp(wrongTimes(5), after);
    expect(s).toEqual({ wrong: 1, lockedUntil: null });
  });
});

describe('resend timer: resend after 30 s', () => {
  const t0 = 1_000_000;

  it('can send at once when nothing was sent', () => {
    expect(resendSecondsLeft(null, t0, 30)).toBe(0);
  });

  it('counts down from 30 seconds', () => {
    expect(resendSecondsLeft(t0, t0, 30)).toBe(30);
    expect(resendSecondsLeft(t0, t0 + 10_500, 30)).toBe(20);
    expect(resendSecondsLeft(t0, t0 + 29_001, 30)).toBe(1);
  });

  it('allows resend at 30 seconds and after', () => {
    expect(resendSecondsLeft(t0, t0 + 30_000, 30)).toBe(0);
    expect(resendSecondsLeft(t0, t0 + 90_000, 30)).toBe(0);
  });
});
