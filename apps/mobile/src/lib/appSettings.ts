import { needsUpdate } from '@food-rescue/shared';
import { useQuery } from '@tanstack/react-query';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

import { supabase } from './supabase';

export type PublicSettings = Record<string, unknown>;

/** Reads app_settings_public (non-secret keys). Cached and persisted for offline use. */
export function useAppSettings() {
  return useQuery({
    queryKey: ['app_settings_public'],
    queryFn: async (): Promise<PublicSettings> => {
      const { data, error } = await supabase.from('app_settings_public').select('key, value');
      if (error) throw error;
      return Object.fromEntries(
        (data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]),
      );
    },
    staleTime: 5 * 60_000,
  });
}

export function installedVersion(): string {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';
}

/** Which system screen, if any, should cover the app. */
export function systemGate(settings: PublicSettings | undefined): 'maintenance' | 'update' | null {
  if (!settings) return null;
  if (settings.maintenance === true) return 'maintenance';
  const min = settings.min_app_version;
  if (typeof min === 'string' && needsUpdate(installedVersion(), min)) return 'update';
  return null;
}
