import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';

import { buildOtpMessage, maskPhone, smsLocale, toE164 } from './message.ts';
import { getProvider } from './providers.ts';

const env = (vars: Record<string, string>) => ({ get: (k: string) => vars[k] });

Deno.test('English OTP message format', () => {
  assertEquals(
    buildOtpMessage('123456', 'en'),
    'Food Rescue code: 123456. Do not share this code with anyone.',
  );
});

Deno.test('Nepali OTP message format keeps Latin digits for autofill', () => {
  const msg = buildOtpMessage('123456', 'ne');
  assertEquals(msg, 'फुड रेस्क्यु कोड: 123456। यो कोड कसैलाई नदिनुहोस्।');
  assert(msg.includes('123456'));
});

Deno.test('each message fits one SMS segment', () => {
  assert(buildOtpMessage('999999', 'en').length <= 160, 'English fits one GSM segment');
  assert(buildOtpMessage('999999', 'ne').length <= 70, 'Nepali fits one Unicode segment');
});

Deno.test('only 6-digit codes are accepted', () => {
  assertThrows(() => buildOtpMessage('12345'));
  assertThrows(() => buildOtpMessage('12345a'));
  assertThrows(() => buildOtpMessage('1234567'));
});

Deno.test('locale comes from metadata, default English', () => {
  assertEquals(smsLocale({ locale: 'ne' }), 'ne');
  assertEquals(smsLocale({ locale: 'fr' }), 'en');
  assertEquals(smsLocale(undefined), 'en');
});

Deno.test('phone helpers', () => {
  assertEquals(toE164('9779812345678'), '+9779812345678');
  assertEquals(toE164('+9779812345678'), '+9779812345678');
  assertEquals(maskPhone('+9779812345678'), '+97798****5678');
});

Deno.test('console provider only on a local stack', () => {
  assertEquals(getProvider(env({ SUPABASE_URL: 'http://kong:8000' })).name, 'console');
  assertThrows(() => getProvider(env({ SUPABASE_URL: 'https://abc.supabase.co' })));
  assertEquals(
    getProvider(env({ SUPABASE_URL: 'https://abc.supabase.co', SMS_PROVIDER: 'sparrow' })).name,
    'sparrow',
  );
  assertThrows(() => getProvider(env({ SMS_PROVIDER: 'other', SUPABASE_URL: 'http://kong:8000' })));
});
