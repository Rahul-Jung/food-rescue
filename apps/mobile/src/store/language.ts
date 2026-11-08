import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStringStorage } from '../lib/storage';

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

// Saved in MMKV so the choice survives restarts (synced to profiles.locale in T2.x).
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      locale: deviceLocale(),
      digits: 'latin',
      setLocale: (locale) => set({ locale }),
      setDigits: (digits) => set({ digits }),
    }),
    { name: 'language', storage: createJSONStorage(() => appStringStorage) },
  ),
);
