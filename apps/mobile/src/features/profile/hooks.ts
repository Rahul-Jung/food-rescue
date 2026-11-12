import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { useSessionStore } from '../../store/session';
import { fetchMyProfile, updateMyProfile, type MyProfile, type ProfilePatch } from './api';

export const myProfileKey = (userId: string | undefined) => ['my_profile', userId] as const;

export function useMyProfile() {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: myProfileKey(userId),
    queryFn: () => fetchMyProfile(userId!),
    enabled: !!userId,
  });
}

/**
 * Optimistic update ("edits show at once"): the cache changes before the
 * server answers and is rolled back if the save fails.
 */
export function profileMutationOptions(
  queryClient: QueryClient,
  userId: string | undefined,
  save: (patch: ProfilePatch) => Promise<MyProfile> = updateMyProfile,
) {
  const key = myProfileKey(userId);
  return {
    mutationFn: save,
    onMutate: async (patch: ProfilePatch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MyProfile>(key);
      if (previous) queryClient.setQueryData<MyProfile>(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (_err: unknown, _patch: ProfilePatch, ctx?: { previous?: MyProfile }) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSuccess: (saved: MyProfile) => {
      queryClient.setQueryData(key, saved);
    },
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const userId = useSessionStore((s) => s.session?.user.id);
  return useMutation(profileMutationOptions(queryClient, userId));
}
