import {
  clusterPoints,
  formatDistance,
  pickupAfterToday,
  priceBoxToPaisa,
  priceRangeError,
} from './discover';

describe('formatDistance', () => {
  it('shows km with one decimal', () => {
    expect(formatDistance(600)).toBe('0.6 km');
    expect(formatDistance(1999)).toBe('2.0 km');
    expect(formatDistance(12_400)).toBe('12 km');
  });
  it('uses Nepali unit and digits', () => {
    expect(formatDistance(600, 'ne', 'devanagari')).toBe('०.६ कि.मि.');
  });
});

describe('price filter boxes', () => {
  it('turns rupees into paisa', () => {
    expect(priceBoxToPaisa('200')).toBe(20000);
    expect(priceBoxToPaisa(' ')).toBeUndefined();
    expect(priceBoxToPaisa('2a')).toBeNull();
  });
  it('flags min above max', () => {
    expect(priceRangeError(30000, 10000)).toBe(true);
    expect(priceRangeError(10000, 10000)).toBe(false);
    expect(priceRangeError(undefined, 10000)).toBe(false);
  });
});

describe('pickupAfterToday', () => {
  it('is that clock time today in Nepal', () => {
    // 2026-11-16 10:00 NPT = 04:15 UTC; 5:00 PM NPT = 11:15 UTC
    expect(pickupAfterToday('17:00', new Date('2026-11-16T04:15:00Z'))).toBe(
      '2026-11-16T11:15:00.000Z',
    );
  });
  it('is empty for no time', () => {
    expect(pickupAfterToday('')).toBeUndefined();
  });
});

describe('clusterPoints', () => {
  const pts = [
    { id: 'a', lat: 27.671, lng: 85.311 },
    { id: 'b', lat: 27.6711, lng: 85.3111 },
    { id: 'c', lat: 27.72, lng: 85.33 },
  ];
  it('merges close points when zoomed out', () => {
    const c = clusterPoints(pts, { latitudeDelta: 0.2, longitudeDelta: 0.2 });
    expect(c).toHaveLength(2);
    expect(c.find((x) => x.items.length === 2)?.items.map((p) => p.id)).toEqual(['a', 'b']);
  });
  it('keeps every point when zoomed in', () => {
    expect(clusterPoints(pts, { latitudeDelta: 0.002, longitudeDelta: 0.002 })).toHaveLength(3);
  });
  it('handles 150 points', () => {
    const many = Array.from({ length: 150 }, (_, i) => ({
      id: String(i),
      lat: 27.67 + (i % 15) * 0.002,
      lng: 85.31 + Math.floor(i / 15) * 0.002,
    }));
    const c = clusterPoints(many, { latitudeDelta: 0.06, longitudeDelta: 0.06 });
    expect(c.reduce((n, x) => n + x.items.length, 0)).toBe(150);
    expect(c.length).toBeLessThan(150);
  });
});
