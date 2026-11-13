import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '../../store/session';
import {
  fetchHours,
  fetchMyVendor,
  saveHours,
  saveVendor,
  submitApplication,
  type MyVendor,
  type VendorPatch,
} from './api';
import type { DayHours } from '@food-rescue/shared';

export const myVendorKey = (userId: string | undefined) => ['my_vendor', userId] as const;
export const vendorHoursKey = (vendorId: string | undefined) => ['vendor_hours', vendorId] as const;

export function useMyVendor() {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: myVendorKey(userId),
    queryFn: () => fetchMyVendor(userId!),
    enabled: !!userId,
  });
}

/** Saves a step as a draft and keeps the cache in step with the server. */
export function useSaveVendor() {
  const qc = useQueryClient();
  const userId = useSessionStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: VendorPatch }) => saveVendor(id, patch),
    onSuccess: (saved: MyVendor) => qc.setQueryData(myVendorKey(userId), saved),
  });
}

export function useSubmitApplication() {
  const qc = useQueryClient();
  const userId = useSessionStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: submitApplication,
    onSuccess: (saved: MyVendor) => qc.setQueryData(myVendorKey(userId), saved),
  });
}

export function useVendorHours(vendorId: string | undefined) {
  return useQuery({
    queryKey: vendorHoursKey(vendorId),
    queryFn: () => fetchHours(vendorId!),
    enabled: !!vendorId,
  });
}

export function useSaveHours(vendorId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (week: DayHours[]) => saveHours(vendorId!, week),
    onSuccess: (_: void, week: DayHours[]) => qc.setQueryData(vendorHoursKey(vendorId), week),
  });
}
