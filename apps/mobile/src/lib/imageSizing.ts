// Pure parts of the image helper (T3.2), unit tested without native modules.
// Plan section 9 Media: resize to 1280 px long side, compress under 300 KB;
// a 320 px thumbnail for cards; failed uploads retry three times.

export const FULL_LONG_SIDE = 1280;
export const THUMB_LONG_SIDE = 320;
export const FULL_MAX_BYTES = 300 * 1024;
export const THUMB_MAX_BYTES = 60 * 1024;
export const QUALITY_STEPS = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3] as const;
export const UPLOAD_TRIES = 3;

/** Resize that keeps the aspect ratio and only shrinks (null = already small enough). */
export function fitLongSide(
  width: number,
  height: number,
  maxSide: number,
): { width: number } | { height: number } | null {
  if (width <= 0 || height <= 0) return null;
  if (Math.max(width, height) <= maxSide) return null;
  return width >= height ? { width: maxSide } : { height: maxSide };
}

/**
 * Tries each quality step until the encoded file fits. Returns the first that
 * fits, or the smallest attempt (the server still refuses anything over 1 MB).
 */
export async function compressUnder<T extends { bytes: number }>(
  maxBytes: number,
  encode: (quality: number) => Promise<T>,
  steps: readonly number[] = QUALITY_STEPS,
): Promise<T> {
  let best: T | null = null;
  for (const q of steps) {
    const out = await encode(q);
    if (out.bytes <= maxBytes) return out;
    if (!best || out.bytes < best.bytes) best = out;
  }
  if (!best) throw new Error('no quality steps');
  return best;
}

/** Runs fn up to `tries` times with a growing wait between attempts. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  tries = UPLOAD_TRIES,
  waitMs = (attempt: number) => 500 * 2 ** attempt,
  sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < tries - 1) await sleep(waitMs(attempt));
    }
  }
  throw lastError;
}
