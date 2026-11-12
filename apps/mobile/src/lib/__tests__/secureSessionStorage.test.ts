import { CHUNK_SIZE, createChunkedStorage, safeKey } from '../secureSessionStorage';

function memoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: jest.fn(async (k: string) => data.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      if (v.length > 2048) throw new Error('value over the 2 KB secure-store limit');
      data.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      data.delete(k);
    }),
  };
}

const KEY = 'sb-127-auth-token';
const session = JSON.stringify({ access_token: 'a'.repeat(3000), refresh_token: 'r'.repeat(500) });

describe('secure-store session storage (chunked)', () => {
  it('stores a session larger than 2 KB in chunks and reads it back', async () => {
    const store = memoryStore();
    const s = createChunkedStorage(store);
    await s.setItem(KEY, session);
    expect(store.data.get(`${KEY}.n`)).toBe(String(Math.ceil(session.length / CHUNK_SIZE)));
    for (const v of store.data.values()) expect(v.length).toBeLessThanOrEqual(CHUNK_SIZE);
    expect(await s.getItem(KEY)).toBe(session);
  });

  it('returns null when nothing is stored', async () => {
    expect(await createChunkedStorage(memoryStore()).getItem(KEY)).toBeNull();
  });

  it('a shorter value replaces a longer one without leftover chunks', async () => {
    const store = memoryStore();
    const s = createChunkedStorage(store);
    await s.setItem(KEY, session);
    await s.setItem(KEY, 'short');
    expect(await s.getItem(KEY)).toBe('short');
    expect([...store.data.keys()].sort()).toEqual([`${KEY}.0`, `${KEY}.n`]);
  });

  it('removeItem deletes every chunk (logout)', async () => {
    const store = memoryStore();
    const s = createChunkedStorage(store);
    await s.setItem(KEY, session);
    await s.removeItem(KEY);
    expect(store.data.size).toBe(0);
    expect(await s.getItem(KEY)).toBeNull();
  });

  it('a missing chunk reads as signed out, not as a broken session', async () => {
    const store = memoryStore();
    const s = createChunkedStorage(store);
    await s.setItem(KEY, session);
    store.data.delete(`${KEY}.1`);
    expect(await s.getItem(KEY)).toBeNull();
  });

  it('keeps keys to the characters secure store allows', () => {
    expect(safeKey('sb-abc-auth-token')).toBe('sb-abc-auth-token');
    expect(safeKey('sb:abc/auth token')).toBe('sb_abc_auth_token');
  });
});
