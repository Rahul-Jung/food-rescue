import { PROFILE_NAME_MAX, profileNameSchema } from './auth';

const issue = (name: string) => profileNameSchema.safeParse(name).error?.issues[0]?.message;

describe('profile name (C-24): Devanagari allowed, length checked', () => {
  it('accepts Devanagari names, with vowel signs and halant', () => {
    expect(profileNameSchema.parse('सीता शर्मा')).toBe('सीता शर्मा');
    expect(profileNameSchema.parse('कृष्ण प्रसाद श्रेष्ठ')).toBe('कृष्ण प्रसाद श्रेष्ठ');
  });

  it("accepts Latin names with . ' and -", () => {
    expect(profileNameSchema.parse("  Ram B. K.C-O'Neil ")).toBe("Ram B. K.C-O'Neil");
  });

  it('checks the length in characters', () => {
    expect(issue('')).toBe('required');
    expect(issue('   ')).toBe('required');
    expect(profileNameSchema.safeParse('क'.repeat(PROFILE_NAME_MAX)).success).toBe(true);
    expect(issue('क'.repeat(PROFILE_NAME_MAX + 1))).toBe('too_long');
  });

  it('refuses digits and symbols', () => {
    expect(issue('Sita 2')).toBe('invalid_chars');
    expect(issue('<script>')).toBe('invalid_chars');
    expect(issue('sita@example')).toBe('invalid_chars');
  });
});
