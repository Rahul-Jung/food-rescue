import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { fetchOfferDetail, fetchVendorPage } from './api';

// Both are in the persisted query cache, so a page opened before shows offline (N4).

export const offerDetailKey = (id: string) => ['offer-detail', id] as const;
export const vendorPageKey = (id: string) => ['vendor-page', id] as const;

export function useOfferDetail(id: string | undefined) {
  return useQuery({
    queryKey: offerDetailKey(id ?? ''),
    queryFn: () => fetchOfferDetail(id!),
    enabled: !!id,
  });
}

export function useVendorPage(id: string | undefined) {
  return useQuery({
    queryKey: vendorPageKey(id ?? ''),
    queryFn: () => fetchVendorPage(id!),
    enabled: !!id,
  });
}

/** Re-renders once when the given instant passes (deal ending, offer expiring). */
export function useNowPassing(at: string | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!at) return;
    const ms = new Date(at).getTime() - Date.now();
    if (ms <= 0) return;
    // setTimeout caps near 24.8 days; a deal window is far shorter.
    const id = setTimeout(() => setNow(Date.now()), Math.min(ms + 500, 2_000_000_000));
    return () => clearTimeout(id);
  }, [at]);
  return now;
}
