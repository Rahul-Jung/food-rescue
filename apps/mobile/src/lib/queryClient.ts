import NetInfo from '@react-native-community/netinfo';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { toAppError } from '@food-rescue/shared';
import {
  focusManager,
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';
import { AppState } from 'react-native';

import { useSessionStore } from '../store/session';
import { appStringStorage } from './storage';

/**
 * T2.7: if any request answers ACCOUNT_SUSPENDED, the status changed while the
 * app was open; mark the session suspended so the gate shows the blocked screen.
 */
export function onSuspendedError(error: unknown) {
  if (toAppError(error).code === 'ACCOUNT_SUSPENDED') {
    useSessionStore.getState().setStatus('suspended');
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onSuspendedError }),
  mutationCache: new MutationCache({ onError: onSuspendedError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60_000, // keep a day so the persisted cache is useful offline
      retry: 2,
    },
  },
});

/** Cache survives restarts, so screens show saved data when offline. */
/** Where the persisted cache lives in MMKV (cleared on logout). */
export const QUERY_CACHE_KEY = 'query-cache';

export const queryPersister = createSyncStoragePersister({
  storage: appStringStorage,
  key: QUERY_CACHE_KEY,
});

// Pause and resume queries with the real network state.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
);

// Refetch stale data when the app comes back to the foreground.
AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
