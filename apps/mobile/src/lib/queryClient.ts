import NetInfo from '@react-native-community/netinfo';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { appStringStorage } from './storage';

export const queryClient = new QueryClient({
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
