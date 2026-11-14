// upload-sign rules (T3.2), kept pure so they can be unit tested.
// Plan section 8 storage: public-images paths are
//   vendors/{vendor_id}/logo.webp
//   offers/{vendor_id}/{offer_id}/{n}.webp   (+ {n}_thumb.webp, the 320 px card image)
//   avatars/{user_id}.webp
// Types JPEG, PNG, WebP; size <= 1 MB after compression.

export const MAX_BYTES = 1024 * 1024;

export const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const EXT = '(webp|jpg|png)';

const VENDOR_LOGO = new RegExp(`^vendors/(${UUID})/logo\\.${EXT}$`);
const OFFER_IMAGE = new RegExp(`^offers/(${UUID})/(${UUID})/([0-4])(_thumb)?\\.${EXT}$`);
const AVATAR = new RegExp(`^avatars/(${UUID})\\.${EXT}$`);

export type UploadTarget =
  | { kind: 'vendor_logo'; vendorId: string; ext: string }
  | { kind: 'offer_image'; vendorId: string; offerId: string; ext: string }
  | { kind: 'avatar'; userId: string; ext: string };

export type RuleError = 'VALIDATION_FAILED';

export interface UploadRequest {
  path: unknown;
  contentType: unknown;
  size: unknown;
}

/** Checks type, size and path prefix. Ownership is checked by the caller. */
export function checkUpload(
  req: UploadRequest,
): { ok: true; target: UploadTarget } | { ok: false; error: RuleError; field: string } {
  const type = typeof req.contentType === 'string' ? req.contentType.toLowerCase() : '';
  const ext = ALLOWED_TYPES[type];
  if (!ext) return { ok: false, error: 'VALIDATION_FAILED', field: 'contentType' };

  const size = typeof req.size === 'number' ? req.size : NaN;
  if (!Number.isInteger(size) || size <= 0 || size > MAX_BYTES) {
    return { ok: false, error: 'VALIDATION_FAILED', field: 'size' };
  }

  const path = typeof req.path === 'string' ? req.path.toLowerCase() : '';
  let target: UploadTarget | null = null;
  let m = VENDOR_LOGO.exec(path);
  if (m) target = { kind: 'vendor_logo', vendorId: m[1], ext: m[2] };
  m = target ? null : OFFER_IMAGE.exec(path);
  if (m) target = { kind: 'offer_image', vendorId: m[1], offerId: m[2], ext: m[5] };
  m = target ? null : AVATAR.exec(path);
  if (m) target = { kind: 'avatar', userId: m[1], ext: m[2] };

  if (!target) return { ok: false, error: 'VALIDATION_FAILED', field: 'path' };
  // The file name must match the declared type (no .webp holding a PNG).
  if (target.ext !== ext) return { ok: false, error: 'VALIDATION_FAILED', field: 'contentType' };
  return { ok: true, target };
}
