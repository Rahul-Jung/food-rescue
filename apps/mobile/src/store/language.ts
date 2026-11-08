import { getLocales } from 'expo-localization';
import { create } from 'zustand';

export type Locale = 'en' | 'ne';
export type Digits = 'latin' | 'devanagari';

/** Nepali if the phone is set to Nepali, else English. */
export function deviceLocale(): Locale {
  return getLocales()[0]?.languageCode === 'ne' ? 'ne' : 'en';
}

interface LanguageState {
  locale: Locale;
  digits: Digits;
  setLocale: (locale: Locale) => void;
  setDigits: (digits: Digits) => void;
}

// In memory for now; persisted with MMKV in T1.7.
export const useLanguageStore = create<LanguageState>((set) => ({
  locale: deviceLocale(),
  digits: 'latin',
  setLocale: (locale) => set({ locale }),
  setDigits: (digits) => set({ digits }),
}));
