import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createMMKV, type MMKV } from 'react-native-mmkv';

/** Plain, fast storage for caches and preferences (no personal data). */
export const appStorage = createMMKV({ id: 'app' });

const KEY_NAME = 'mmkv-secure-key';
let secure: MMKV | null = null;

/**
 * Encrypted MMKV for the auth session. The key lives in the OS keystore via
 * expo-secure-store, which itself is too small (2 KB) for a full session.
 */
export async function secureStorage(): Promise<MMKV> {
  if (secure) return secure;
  let key = await SecureStore.getItemAsync(KEY_NAME);
  if (!key) {
    // 16 printable chars (MMKV's AES-128 limit) from 16 random bytes.
    key = Array.from(Crypto.getRandomBytes(16), (b) => String.fromCharCode(33 + (b % 94))).join('');
    await SecureStore.setItemAsync(KEY_NAME, key);
  }
  secure = createMMKV({ id: 'secure', encryptionKey: key });
  return secure;
}

/** Sync string storage shape used by zustand persist and the query persister. */
export const appStringStorage = {
  getItem: (k: string) => appStorage.getString(k) ?? null,
  setItem: (k: string, v: string) => appStorage.set(k, v),
  removeItem: (k: string) => {
    appStorage.remove(k);
  },
};
