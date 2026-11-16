import { insidePilotArea } from '@food-rescue/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAppSettings } from '../../lib/appSettings';
import { areaPoint } from '../../lib/location';
import { useFilterStore, type Filters } from '../../store/filters';
import { useLocationStore, type SearchPoint } from '../../store/location';
import { useOnboardingStore } from '../../store/onboarding';
import { useMyProfile } from '../profile/hooks';
import { fetchNearby, PAGE_SIZE, type NearbyOffer, type NearbyParams } from './api';

/** The point searches use: this session's GPS fix or picked area, else the saved area. */
export function useSearchPoint(): SearchPoint | null {
  const point = useLocationStore((s) => s.point);
  const area = useOnboardingStore((s) => s.area);
  return point ?? (area ? areaPoint(area) : null);
}

/** Outside the pilot polygon (T5.3): the app shows the waitlist instead. */
export function useOutsidePilot(point: SearchPoint | null): boolean {
  const polygon = useAppSettings().data?.pilot_polygon;
  return !!point && !insidePilotArea(point.lat, point.lng, polygon);
}

/** Radius for searches: a session override (C-29 "try 3 km"), else the profile's (C-25). */
export function useRadius(): number {
  const override = useFilterStore((s) => s.radius);
  const profile = useMyProfile().data?.radius_m;
  return override ?? profile ?? 2000;
}

export function useFilters(): Filters {
  const s = useFilterStore();
  return {
    q: s.q,
    kind: s.kind,
    foodType: s.foodType,
    vendorType: s.vendorType,
    priceMin: s.priceMin,
    priceMax: s.priceMax,
    pickupAfter: s.pickupAfter,
    sort: s.sort,
    radius: s.radius,
  };
}

/** Round so a GPS jitter of a few metres reuses the cached list. */
const round = (n: number) => Math.round(n * 10_000) / 10_000;

export const nearbyKey = (p: NearbyParams | null) => ['nearby', p] as const;

/**
 * C-06 / C-07 / C-08 list: 20 per page, infinite scroll. Results are in the
 * persisted query cache, so the last list shows offline (N4).
 */
export function useNearbyOffers(
  overrides: Partial<NearbyParams> = {},
  options: { allPages?: boolean; enabled?: boolean } = {},
) {
  const point = useSearchPoint();
  const filters = useFilters();
  const radius = useRadius();
  const params: NearbyParams | null = point
    ? {
        ...filters,
        lat: round(point.lat),
        lng: round(point.lng),
        radius,
        ...overrides,
      }
    : null;

  const query = useInfiniteQuery({
    queryKey: nearbyKey(params),
    queryFn: ({ pageParam }) => fetchNearby(params!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last: NearbyOffer[], pages) =>
      last.length === PAGE_SIZE && pages.length < 50 ? pages.length : undefined,
    enabled: !!params && options.enabled !== false,
  });

  // C-07 map: load every page so all pins in the radius show.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (options.allPages && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [options.allPages, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const offers = query.data?.pages.flat() ?? [];
  return { ...query, offers, params };
}
