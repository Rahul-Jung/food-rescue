import { AuthApiError } from '@supabase/supabase-js';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn() }));

import { toAuthFailure } from '../api';

describe('auth errors map to shared error codes', () => {
  it('rate limits become RATE_LIMITED', () => {
    expect(toAuthFailure(new AuthApiError('RATE_LIMITED', 429, 'unknown'), 'phone')).toEqual({
      code: 'RATE_LIMITED',
      smsDown: false,
    });
  });

  it('a wrong or expired code becomes CODE_INVALID', () => {
    expect(
      toAuthFailure(
        new AuthApiError('Token has expired or is invalid', 403, 'otp_expired'),
        'phone',
      ).code,
    ).toBe('CODE_INVALID');
  });

  it('SMS failures offer email (SMS down)', () => {
    expect(
      toAuthFailure(new AuthApiError('hook failed', 500, 'unexpected_failure'), 'phone'),
    ).toEqual({ code: 'UNKNOWN', smsDown: true });
  });

  it('email failures never claim SMS is down', () => {
    expect(toAuthFailure(new AuthApiError('x', 500, 'unexpected_failure'), 'email').smsDown).toBe(
      false,
    );
  });

  it('anything else is UNKNOWN (no raw text shown)', () => {
    expect(toAuthFailure(new Error('boom'), 'phone')).toEqual({ code: 'UNKNOWN', smsDown: false });
  });
});
