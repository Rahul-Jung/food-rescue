import * as SecureStore from 'expo-secure-store';

// Auth session storage on expo-secure-store (plan: "tokens in
// expo-secure-store"). The OS keystore holds about 2 KB per item and a
// Supabase session is larger, so values are split into chunks:
//   <key>.n      number of chunks
//   <key>.0 ...  the chunks

export const CHUNK_SIZE = 1800;

/** SecureStore keys may only contain letters, digits, '.', '-' and '_'. */
export function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

type Store = Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'>;

export function createChunkedStorage(store: Store = SecureStore) {
  async function removeItem(key: string): Promise<void> {
    const k = safeKey(key);
    const n = Number((await store.getItemAsync(`${k}.n`)) ?? 0);
    await Promise.all(Array.from({ length: n }, (_, i) => store.deleteItemAsync(`${k}.${i}`)));
    await store.deleteItemAsync(`${k}.n`);
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const k = safeKey(key);
      const raw = await store.getItemAsync(`${k}.n`);
      if (raw === null) return null;
      const n = Number(raw);
      const parts = await Promise.all(
        Array.from({ length: n }, (_, i) => store.getItemAsync(`${k}.${i}`)),
      );
      // A missing chunk means a half-written value: treat as signed out.
      if (parts.some((p) => p === null)) return null;
      return parts.join('');
    },

    async setItem(key: string, value: string): Promise<void> {
      const k = safeKey(key);
      await removeItem(key);
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE)
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      await Promise.all(chunks.map((c, i) => store.setItemAsync(`${k}.${i}`, c)));
      // Count is written last, so a crash mid-write leaves no readable value.
      await store.setItemAsync(`${k}.n`, String(chunks.length));
    },

    removeItem,
  };
}

export const secureSessionStorage = createChunkedStorage();
