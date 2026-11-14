import { assertEquals } from 'jsr:@std/assert@1';

import { checkUpload, MAX_BYTES } from './rules.ts';

const V = '11111111-2222-4333-8444-555555555555';
const O = '66666666-7777-4888-9999-000000000000';

Deno.test('vendor logo in WebP is accepted', () => {
  const r = checkUpload({
    path: `vendors/${V}/logo.webp`,
    contentType: 'image/webp',
    size: 40_000,
  });
  assertEquals(r, { ok: true, target: { kind: 'vendor_logo', vendorId: V, ext: 'webp' } });
});

Deno.test('offer image and its thumbnail are accepted', () => {
  const full = checkUpload({
    path: `offers/${V}/${O}/0.webp`,
    contentType: 'image/webp',
    size: 250_000,
  });
  const thumb = checkUpload({
    path: `offers/${V}/${O}/0_thumb.jpg`,
    contentType: 'image/jpeg',
    size: 30_000,
  });
  assertEquals(full.ok, true);
  assertEquals(thumb.ok, true);
});

Deno.test('avatar path is accepted', () => {
  assertEquals(
    checkUpload({ path: `avatars/${V}.png`, contentType: 'image/png', size: 10 }).ok,
    true,
  );
});

Deno.test('wrong type is refused', () => {
  assertEquals(
    checkUpload({ path: `vendors/${V}/logo.webp`, contentType: 'image/gif', size: 10 }),
    {
      ok: false,
      error: 'VALIDATION_FAILED',
      field: 'contentType',
    },
  );
  assertEquals(
    checkUpload({ path: `vendors/${V}/logo.webp`, contentType: 'application/pdf', size: 10 }).ok,
    false,
  );
});

Deno.test('file name must match the declared type', () => {
  const r = checkUpload({ path: `vendors/${V}/logo.webp`, contentType: 'image/png', size: 10 });
  assertEquals(r, { ok: false, error: 'VALIDATION_FAILED', field: 'contentType' });
});

Deno.test('over 1 MB, zero or missing size is refused', () => {
  for (const size of [MAX_BYTES + 1, 0, -1, 1.5, undefined, '100']) {
    const r = checkUpload({ path: `vendors/${V}/logo.webp`, contentType: 'image/webp', size });
    assertEquals(r.ok, false, `size ${size}`);
  }
  assertEquals(
    checkUpload({ path: `vendors/${V}/logo.webp`, contentType: 'image/webp', size: MAX_BYTES }).ok,
    true,
  );
});

Deno.test('paths outside the allowed prefixes are refused', () => {
  for (const path of [
    `pan/${V}/doc.webp`,
    `vendors/${V}/other.webp`,
    `vendors/not-a-uuid/logo.webp`,
    `offers/${V}/${O}/5.webp`,
    `offers/${V}/${O}/../0.webp`,
    `../vendors/${V}/logo.webp`,
    `vendors/${V}/logo.webp/extra`,
    '',
  ]) {
    const r = checkUpload({ path, contentType: 'image/webp', size: 10 });
    assertEquals(r.ok, false, path);
  }
});
