import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../../locales/en.json';
import ne from '../../locales/ne.json';
import { useLanguageStore } from '../store/language';

export const resources = {
  en: { translation: en },
  ne: { translation: ne },
} as const;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: (typeof resources)['en'];
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: useLanguageStore.getState().locale,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

// Changing the store language re-renders every useTranslation() screen; no restart needed.
useLanguageStore.subscribe((state, prev) => {
  if (state.locale !== prev.locale) void i18n.changeLanguage(state.locale);
});

export default i18n;
