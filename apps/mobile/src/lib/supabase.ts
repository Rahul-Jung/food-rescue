import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from './env';
import { secureStorage } from './storage';

// The app only reads through RLS and calls named RPCs / Edge Functions; it never writes tables.
export const supabase = createClient(
  env.supabaseUrl || 'http://127.0.0.1:54321',
  env.supabaseAnonKey || 'missing',
  {
    auth: {
      storage: {
        getItem: async (k) => (await secureStorage()).getString(k) ?? null,
        setItem: async (k, v) => (await secureStorage()).set(k, v),
        removeItem: async (k) => {
          (await secureStorage()).remove(k);
        },
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});
