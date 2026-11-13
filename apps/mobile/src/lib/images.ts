// Image helper (T3.2): pick or take a photo, make a 1280 px image under
// 300 KB plus a 320 px thumbnail (WebP), and upload through upload-sign with
// retries. Supabase image transforms are paid, so the app makes both sizes.
import { toAppError } from '@food-rescue/shared';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import {
  compressUnder,
  fitLongSide,
  FULL_LONG_SIDE,
  FULL_MAX_BYTES,
  THUMB_LONG_SIDE,
  THUMB_MAX_BYTES,
  withRetry,
} from './imageSizing';
import { supabase } from './supabase';

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
  bytes: number;
  contentType: 'image/webp';
}

export type PickSource = 'camera' | 'library';

/** Opens the camera or the photo library. Null when cancelled or not allowed. */
export async function pickImage(source: PickSource): Promise<string | null> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

async function fileBytes(uri: string): Promise<number> {
  const blob = await (await fetch(uri)).blob();
  return blob.size;
}

/** Resizes to `longSide` and compresses to WebP under `maxBytes`. */
export async function prepareImage(
  uri: string,
  longSide: number,
  maxBytes: number,
): Promise<PreparedImage> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const resize = fitLongSide(original.width, original.height, longSide);
  const ctx = ImageManipulator.manipulate(uri);
  if (resize) ctx.resize(resize);
  const ref = await ctx.renderAsync();
  return compressUnder(maxBytes, async (quality) => {
    const saved = await ref.saveAsync({ compress: quality, format: SaveFormat.WEBP });
    return {
      uri: saved.uri,
      width: saved.width,
      height: saved.height,
      bytes: await fileBytes(saved.uri),
      contentType: 'image/webp' as const,
    };
  });
}

/** The 1280 px detail image and the 320 px card thumbnail. */
export async function prepareFullAndThumb(uri: string) {
  const full = await prepareImage(uri, FULL_LONG_SIDE, FULL_MAX_BYTES);
  const thumb = await prepareImage(uri, THUMB_LONG_SIDE, THUMB_MAX_BYTES);
  return { full, thumb };
}

interface SignedUpload {
  path: string;
  token: string;
}

/** Asks upload-sign for a signed URL, then uploads. Retries three times. */
export async function uploadPublicImage(path: string, image: PreparedImage): Promise<string> {
  return withRetry(async () => {
    const { data, error } = await supabase.functions.invoke<SignedUpload>('upload-sign', {
      body: { path, contentType: image.contentType, size: image.bytes },
    });
    if (error || !data) throw toAppError(error);
    const body = await (await fetch(image.uri)).arrayBuffer();
    const up = await supabase.storage
      .from('public-images')
      .uploadToSignedUrl(data.path, data.token, body, {
        contentType: image.contentType,
        upsert: true,
      });
    if (up.error) throw toAppError(up.error);
    // Built from the app's own Supabase URL: inside the function the URL is
    // the internal one (http://kong:8000 locally), which a phone can't reach.
    return supabase.storage.from('public-images').getPublicUrl(data.path).data.publicUrl;
  });
}

/** Offer photo n (0–4): uploads both sizes; returns the full-size public URL. */
export async function uploadOfferImage(
  vendorId: string,
  offerId: string,
  n: number,
  sourceUri: string,
): Promise<{ full: string; thumb: string }> {
  const { full, thumb } = await prepareFullAndThumb(sourceUri);
  const base = `offers/${vendorId}/${offerId}/${n}`;
  const fullUrl = await uploadPublicImage(`${base}.webp`, full);
  const thumbUrl = await uploadPublicImage(`${base}_thumb.webp`, thumb);
  return { full: fullUrl, thumb: thumbUrl };
}

/** Vendor logo: one 320 px WebP at vendors/{id}/logo.webp. */
export async function uploadVendorLogo(vendorId: string, sourceUri: string): Promise<string> {
  const logo = await prepareImage(sourceUri, THUMB_LONG_SIDE, THUMB_MAX_BYTES);
  const url = await uploadPublicImage(`vendors/${vendorId}/logo.webp`, logo);
  // Same path on every change: add a version so caches show the new logo.
  return `${url}?v=${Date.now()}`;
}
