const mockPermission = jest.fn();
const mockLastKnown = jest.fn();
const mockCurrent = jest.fn();
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => mockPermission(),
  getLastKnownPositionAsync: () => mockLastKnown(),
  getCurrentPositionAsync: () => mockCurrent(),
  Accuracy: { Balanced: 3 },
}));

import { areaPoint, inPilot, locate, pilotAreas } from '../location';

const POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [85.25, 27.62],
      [85.4, 27.62],
      [85.4, 27.76],
      [85.25, 27.76],
      [85.25, 27.62],
    ],
  ],
};
const fix = (accuracy: number) => ({
  coords: { latitude: 27.673, longitude: 85.314, accuracy },
});

describe('T5.3 location helper', () => {
  beforeEach(() => jest.resetAllMocks());

  it('denied permission falls back to picking an area', async () => {
    mockPermission.mockResolvedValue({ status: 'denied' });
    await expect(locate()).resolves.toEqual({ ok: false, reason: 'denied' });
  });

  it('reuses a recent, accurate last known position', async () => {
    mockPermission.mockResolvedValue({ status: 'granted' });
    mockLastKnown.mockResolvedValue(fix(30));
    const r = await locate();
    expect(r).toEqual({
      ok: true,
      point: { lat: 27.673, lng: 85.314, source: 'gps' },
      accuracy: 30,
    });
    expect(mockCurrent).not.toHaveBeenCalled();
  });

  it('asks for a new fix when the last one is poor', async () => {
    mockPermission.mockResolvedValue({ status: 'granted' });
    mockLastKnown.mockResolvedValue(fix(900));
    mockCurrent.mockResolvedValue(fix(20));
    await expect(locate()).resolves.toMatchObject({ ok: true, accuracy: 20 });
  });

  it('no fix = no_fix', async () => {
    mockPermission.mockResolvedValue({ status: 'granted' });
    mockLastKnown.mockResolvedValue(null);
    mockCurrent.mockRejectedValue(new Error('timeout'));
    await expect(locate()).resolves.toEqual({ ok: false, reason: 'no_fix' });
  });

  it('manual area uses its centre point', () => {
    expect(areaPoint({ name: 'Thamel', lat: 27.7154, lng: 85.3123 })).toEqual({
      lat: 27.7154,
      lng: 85.3123,
      source: 'area',
      areaName: 'Thamel',
    });
    expect(pilotAreas([{ name: 'Thamel', lat: 1, lng: 2 }, { name: 'bad' }, 3])).toHaveLength(1);
  });

  it('point outside the pilot polygon is not in the pilot', () => {
    expect(inPilot({ lat: 27.673, lng: 85.314 }, POLYGON)).toBe(true);
    expect(inPilot({ lat: 28.2, lng: 83.98 }, POLYGON)).toBe(false); // Pokhara
    expect(inPilot({ lat: 28.2, lng: 83.98 }, null)).toBe(true); // unknown polygon never blocks
  });
});
