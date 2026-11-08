import { NotoSans_400Regular } from '@expo-google-fonts/noto-sans/400Regular';
import { NotoSans_600SemiBold } from '@expo-google-fonts/noto-sans/600SemiBold';
import { NotoSansDevanagari_400Regular } from '@expo-google-fonts/noto-sans-devanagari/400Regular';
import { NotoSansDevanagari_600SemiBold } from '@expo-google-fonts/noto-sans-devanagari/600SemiBold';

import type { Locale } from './store/language';

// Design kit tokens (plan section 9). Black, white and greys only; states are
// shown with text and icons too, never colour alone (N11).
export const color = {
  ink: '#000000',
  paper: '#FFFFFF',
  grey700: '#404040',
  grey500: '#737373',
  grey300: '#D4D4D4',
  grey100: '#F5F5F5',
  /** Reserved for the future brand colour; same as ink in the MVP. */
  accent: '#000000',
} as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const radius = { box: 8, pill: 999 } as const;

export const fontSize = { caption: 12, body: 14, button: 16, title: 20, number: 24 } as const;
export type TextVariant = keyof typeof fontSize;
export type FontWeight = 400 | 600;

/** Minimum size of every tappable thing (N11). */
export const touch = 44;

/** Cap on the phone's font scale so layouts stay usable at the largest sizes. */
export const maxFontScale = 2;

export const fontAssets = {
  NotoSans_400Regular,
  NotoSans_600SemiBold,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_600SemiBold,
};

/** Noto Sans Devanagari also covers Latin, so Nepali screens use it for everything. */
export function fontFamily(locale: Locale, weight: FontWeight): string {
  const family = locale === 'ne' ? 'NotoSansDevanagari' : 'NotoSans';
  return `${family}_${weight === 600 ? '600SemiBold' : '400Regular'}`;
}

/** Devanagari is taller, so Nepali gets more line height to avoid clipping. */
export function lineHeight(locale: Locale, size: number): number {
  return Math.round(size * (locale === 'ne' ? 1.6 : 1.4));
}
