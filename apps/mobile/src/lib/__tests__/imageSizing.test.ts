import { compressUnder, fitLongSide, withRetry } from '../imageSizing';

describe('fitLongSide', () => {
  it('shrinks a landscape camera photo to 1280 px wide', () => {
    expect(fitLongSide(4000, 3000, 1280)).toEqual({ width: 1280 });
  });
  it('shrinks a portrait photo by height', () => {
    expect(fitLongSide(3000, 4000, 320)).toEqual({ height: 320 });
  });
  it('never enlarges a small image', () => {
    expect(fitLongSide(800, 600, 1280)).toBeNull();
    expect(fitLongSide(0, 0, 1280)).toBeNull();
  });
});

describe('compressUnder', () => {
  it('stops at the first quality that fits', async () => {
    const sizes: Record<number, number> = { 0.8: 500_000, 0.7: 290_000, 0.6: 200_000 };
    const tried: number[] = [];
    const out = await compressUnder(300 * 1024, async (q) => {
      tried.push(q);
      return { bytes: sizes[q] ?? 100_000, q };
    });
    expect(out.q).toBe(0.7);
    expect(tried).toEqual([0.8, 0.7]);
  });
  it('returns the smallest attempt when nothing fits', async () => {
    const out = await compressUnder(
      10,
      async (q) => ({ bytes: Math.round(q * 1000), q }),
      [0.8, 0.5],
    );
    expect(out.q).toBe(0.5);
  });
});

describe('withRetry', () => {
  const noSleep = () => Promise.resolve();
  it('retries up to three times then succeeds', async () => {
    let calls = 0;
    const out = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error('network');
        return 'ok';
      },
      3,
      () => 0,
      noSleep,
    );
    expect(out).toBe('ok');
    expect(calls).toBe(3);
  });
  it('gives up after three tries with the last error', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error(`fail ${calls}`);
        },
        3,
        () => 0,
        noSleep,
      ),
    ).rejects.toThrow('fail 3');
    expect(calls).toBe(3);
  });
});
