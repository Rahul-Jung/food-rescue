import { isRecoveryLink, parseAuthLink } from '../deepLinks';

describe('email link parsing', () => {
  it('reads a reset-password link', () => {
    const link = parseAuthLink(
      'foodrescue://reset-password#access_token=AT&expires_in=3600&refresh_token=RT&token_type=bearer&type=recovery',
    );
    expect(link).toEqual({
      kind: 'session',
      type: 'recovery',
      accessToken: 'AT',
      refreshToken: 'RT',
    });
    expect(isRecoveryLink(link)).toBe(true);
  });

  it('reads a verify-email link (not a recovery link)', () => {
    const link = parseAuthLink(
      'foodrescue://auth-callback#access_token=AT&refresh_token=RT&type=signup',
    );
    expect(link).toMatchObject({ kind: 'session', type: 'signup' });
    expect(isRecoveryLink(link)).toBe(false);
  });

  it('reports an expired or used link', () => {
    expect(
      parseAuthLink(
        'foodrescue://reset-password?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid',
      ),
    ).toEqual({ kind: 'error', code: 'otp_expired' });
    expect(parseAuthLink('foodrescue://auth-callback#error=access_denied')).toEqual({
      kind: 'error',
      code: 'access_denied',
    });
  });

  it('ignores ordinary links and empty input', () => {
    expect(parseAuthLink('foodrescue://offer/123')).toEqual({ kind: 'none' });
    expect(parseAuthLink('foodrescue://auth-callback#access_token=AT')).toEqual({ kind: 'none' });
    expect(parseAuthLink(null)).toEqual({ kind: 'none' });
  });
});
