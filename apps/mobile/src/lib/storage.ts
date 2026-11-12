import { createMMKV } from 'react-native-mmkv';

/** Plain, fast storage for caches and preferences (no tokens, no personal data). */
export const appStorage = createMMKV({ id: 'app' });

/** Sync string storage shape used by zustand persist and the query persister. */
export const appStringStorage = {
  getItem: (k: string) => appStorage.getString(k) ?? null,
  setItem: (k: string, v: string) => appStorage.set(k, v),
  removeItem: (k: string) => {
    appStorage.remove(k);
  },
};
