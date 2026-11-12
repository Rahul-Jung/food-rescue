import type { QueryClient } from '@tanstack/react-query';

import { posthog } from '../../lib/analytics';
import { queryClient, QUERY_CACHE_KEY } from '../../lib/queryClient';
import { appStringStorage } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { useLocationStore } from '../../store/location';
import { useOnboardingStore } from '../../store/onboarding';
import { useSessionStore } from '../../store/session';

export interface LogoutDeps {
  signOut: () => Promise<unknown>;
  queryClient: Pick<QueryClient, 'clear'>;
  removePersisted: (key: string) => void;
  resetAnalytics: () => void;
}

const defaultDeps: LogoutDeps = {
  signOut: () => supabase.auth.signOut(),
  queryClient,
  removePersisted: (key) => appStringStorage.removeItem(key),
  resetAnalytics: () => posthog?.reset(),
};

/**
 * Logout (T2.5): signs out (the session is removed from the secure store),
 * clears the TanStack Query cache in memory and on disk, and resets the
 * user's stores. Device settings stay: language, intro seen, OTP locks.
 */
export async function logout(deps: LogoutDeps = defaultDeps): Promise<void> {
  try {
    await deps.signOut();
  } finally {
    deps.queryClient.clear();
    deps.removePersisted(QUERY_CACHE_KEY);
    useLocationStore.getState().setPoint(null);
    useOnboardingStore.getState().resetForLogout();
    useSessionStore.getState().setPasswordRecovery(false);
    useSessionStore.getState().setSession(null);
    deps.resetAnalytics();
  }
}
