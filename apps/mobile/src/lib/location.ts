import { insidePilotArea } from '@food-rescue/shared';
import * as Location from 'expo-location';

import type { PilotArea } from '../store/onboarding';
import type { SearchPoint } from '../store/location';

/**
 * T5.3 location helper (plan section 9, N7). Foreground permission only; the
 * point is used per search and never stored on the server. No permission or
 * no fix = the customer picks a pilot area, whose centre point is used.
 */

export type LocateResult =
  | { ok: true; point: SearchPoint; accuracy: number | null }
  | { ok: false; reason: 'denied' | 'no_fix' };

/** A fix no older than this is reused instead of waiting for a new one. */
const LAST_KNOWN_MAX_AGE_MS = 5 * 60_000;
/** Worse than this, the last known fix is refreshed with a new reading. */
const GOOD_ACCURACY_M = 200;

export async function locate(): Promise<LocateResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { ok: false, reason: 'denied' };
    let pos = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
    if (!pos || (pos.coords.accuracy ?? Infinity) > GOOD_ACCURACY_M) {
      pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }
    return {
      ok: true,
      point: { lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps' },
      accuracy: pos.coords.accuracy ?? null,
    };
  } catch {
    return { ok: false, reason: 'no_fix' };
  }
}

/** Manual area fallback: the area's centre point. */
export function areaPoint(area: PilotArea): SearchPoint {
  return { lat: area.lat, lng: area.lng, source: 'area', areaName: area.name };
}

/** Pilot areas from app_settings.pilot_areas, ignoring bad rows. */
export function pilotAreas(value: unknown): PilotArea[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is PilotArea =>
      typeof a?.name === 'string' && typeof a?.lat === 'number' && typeof a?.lng === 'number',
  );
}

/** Pilot polygon check (app_settings.pilot_polygon). An unknown polygon never blocks. */
export function inPilot(point: Pick<SearchPoint, 'lat' | 'lng'>, polygon: unknown): boolean {
  return insidePilotArea(point.lat, point.lng, polygon);
}
