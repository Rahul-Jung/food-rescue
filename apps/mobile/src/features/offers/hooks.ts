import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useMyVendor } from '../vendor-onboarding/hooks';
import { fetchDashboard, fetchMyOffers, fetchOffer } from './api';

export const myOffersKey = (vendorId: string | undefined) => ['my_offers', vendorId] as const;
export const offerKey = (id: string | undefined) => ['offer', id] as const;
export const dashboardKey = ['vendor_dashboard'] as const;

export function useMyOffers() {
  const vendorId = useMyVendor().data?.id;
  return useQuery({
    queryKey: myOffersKey(vendorId),
    queryFn: () => fetchMyOffers(vendorId!),
    enabled: !!vendorId,
  });
}

export function useOffer(id: string | undefined) {
  return useQuery({ queryKey: offerKey(id), queryFn: () => fetchOffer(id!), enabled: !!id });
}

export function useDashboard() {
  return useQuery({ queryKey: dashboardKey, queryFn: fetchDashboard, refetchInterval: 60_000 });
}

/** After any offer change: lists, the offer itself and the dashboard. */
export function useRefreshOffers() {
  const qc = useQueryClient();
  return async (id?: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['my_offers'] }),
      qc.invalidateQueries({ queryKey: dashboardKey }),
      id ? qc.invalidateQueries({ queryKey: offerKey(id) }) : Promise.resolve(),
    ]);
  };
}
