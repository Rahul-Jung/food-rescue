import { assertEquals } from 'jsr:@std/assert@1';

import {
  buildEmail,
  buildPushMessages,
  deadTokens,
  EMAIL_TYPES,
  text,
  toLocale,
  type NotificationRow,
} from './messages.ts';

const approved: NotificationRow = {
  id: 'n1',
  user_id: 'u1',
  type: 'vendor_approved',
  title_key: 'notif.vendor_approved.title',
  body_key: 'notif.vendor_approved.body',
  data: { vendor_id: 'v1' },
};

const rejected: NotificationRow = {
  ...approved,
  id: 'n2',
  type: 'vendor_rejected',
  title_key: 'notif.vendor_rejected.title',
  body_key: 'notif.vendor_rejected.body',
  data: { vendor_id: 'v1', reason: 'Blurry PAN' },
};

Deno.test('approval push is in the vendor language', () => {
  const [en] = buildPushMessages(approved, 'en', ['ExponentPushToken[a]']);
  const [ne] = buildPushMessages(approved, 'ne', ['ExponentPushToken[a]']);
  assertEquals(en.title, 'Your business is approved');
  assertEquals(ne.title, 'तपाईंको व्यवसाय स्वीकृत भयो');
  assertEquals(en.data, { vendor_id: 'v1', type: 'vendor_approved', notification_id: 'n1' });
});

Deno.test('one message per token', () => {
  const msgs = buildPushMessages(approved, 'en', ['ExponentPushToken[a]', 'ExponentPushToken[b]']);
  assertEquals(
    msgs.map((m) => m.to),
    ['ExponentPushToken[a]', 'ExponentPushToken[b]'],
  );
});

Deno.test('rejection text carries the reason', () => {
  assertEquals(text('en', rejected.body_key, rejected.data ?? {}).includes('Blurry PAN'), true);
  assertEquals(text('ne', rejected.body_key, rejected.data ?? {}).includes('Blurry PAN'), true);
});

Deno.test('unknown locale falls back to English, unknown key to the key', () => {
  assertEquals(toLocale('fr'), 'en');
  assertEquals(toLocale('ne'), 'ne');
  assertEquals(text('ne', 'notif.unknown'), 'notif.unknown');
});

Deno.test('dead tokens are the DeviceNotRegistered ones', () => {
  const msgs = buildPushMessages(approved, 'en', [
    'ExponentPushToken[a]',
    'ExponentPushToken[b]',
    'ExponentPushToken[c]',
  ]);
  const dead = deadTokens(msgs, [
    { status: 'ok', id: '1' },
    { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
    { status: 'error', message: 'rate', details: { error: 'MessageRateExceeded' } },
  ]);
  assertEquals(dead, ['ExponentPushToken[b]']);
});

Deno.test('approval and rejection also send email, escaped', () => {
  assertEquals(EMAIL_TYPES.has('vendor_approved'), true);
  assertEquals(EMAIL_TYPES.has('vendor_rejected'), true);
  const mail = buildEmail({ ...rejected, data: { reason: '<b>bad</b>' } }, 'en');
  assertEquals(mail.subject, 'Your application needs changes');
  assertEquals(mail.html.includes('<b>'), false);
  assertEquals(mail.html.includes('&lt;b&gt;bad&lt;/b&gt;'), true);
});
