import { assertEquals } from 'jsr:@std/assert@1';

import { mapDbError, parseOrderRequest } from './rules.ts';

const O = '66666666-7777-4888-9999-000000000000';

Deno.test('offer id and quantity are accepted', () => {
  assertEquals(parseOrderRequest({ offer_id: O, quantity: 2 }), {
    ok: true,
    value: { offerId: O, quantity: 2 },
  });
});

Deno.test('a price or total sent by the app is ignored', () => {
  const r = parseOrderRequest({ offer_id: O, quantity: 1, total: 1, unit_price: 1, price: 1 });
  assertEquals(r, { ok: true, value: { offerId: O, quantity: 1 } });
});

Deno.test('a bad offer id is refused', () => {
  assertEquals(parseOrderRequest({ offer_id: 'abc', quantity: 1 }), {
    ok: false,
    error: 'VALIDATION_FAILED',
    field: 'offer_id',
  });
});

Deno.test('quantity must be a whole number of at least 1', () => {
  for (const quantity of [0, -1, 1.5, '2', null, 101]) {
    assertEquals(parseOrderRequest({ offer_id: O, quantity }), {
      ok: false,
      error: 'VALIDATION_FAILED',
      field: 'quantity',
    });
  }
});

Deno.test('no body is refused', () => {
  assertEquals(parseOrderRequest(null), { ok: false, error: 'VALIDATION_FAILED', field: 'body' });
});

Deno.test('database codes map to HTTP statuses; raw text never leaks', () => {
  assertEquals(mapDbError('QUANTITY_EXCEEDED'), { status: 409, error: 'QUANTITY_EXCEEDED' });
  assertEquals(mapDbError('OFFER_UNAVAILABLE'), { status: 409, error: 'OFFER_UNAVAILABLE' });
  assertEquals(mapDbError('RATE_LIMITED'), { status: 429, error: 'RATE_LIMITED' });
  assertEquals(mapDbError('VALIDATION_FAILED'), { status: 400, error: 'VALIDATION_FAILED' });
  assertEquals(mapDbError('relation "x" does not exist'), { status: 500, error: 'UNKNOWN' });
});
