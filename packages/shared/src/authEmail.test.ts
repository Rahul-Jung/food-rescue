import { loginEmailSchema, passwordSchema } from './auth';
import { ERROR_CODES } from './errors';

describe('login email', () => {
  it('accepts a normal address and normalises it', () => {
    expect(loginEmailSchema.parse('  Sita@Example.COM ')).toBe('sita@example.com');
  });

  it('rejects bad addresses', () => {
    for (const bad of ['', 'sita', 'sita@', '@example.com', 'sita@example', 'si ta@example.com']) {
      expect(loginEmailSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe('password rules (8+ chars, a letter and a digit)', () => {
  it('accepts a good password', () => {
    expect(passwordSchema.safeParse('momo2026').success).toBe(true);
    expect(passwordSchema.safeParse('Kathmandu 9').success).toBe(true);
  });

  it('says why a password is rejected', () => {
    const issue = (p: string) => passwordSchema.safeParse(p).error?.issues[0]?.message;
    expect(issue('ab1')).toBe('too_short');
    expect(issue('12345678')).toBe('needs_letter');
    expect(issue('abcdefgh')).toBe('needs_digit');
    expect(issue('a1'.repeat(40))).toBe('too_long');
  });
});

describe('auth error codes', () => {
  it('include the email login codes', () => {
    expect(ERROR_CODES).toContain('EMAIL_NOT_CONFIRMED');
    expect(ERROR_CODES).toContain('INVALID_CREDENTIALS');
  });
});
