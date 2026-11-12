import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from './env';
import { secureSessionStorage } from './secureSessionStorage';

// The app only reads through RLS and calls named RPCs / Edge Functions; it never writes tables.
export const supabase = createClient(
  env.supabaseUrl || 'http://127.0.0.1:54321',
  env.supabaseAnonKey || 'missing',
  {
    auth: {
      // Session tokens live in the OS keystore (expo-secure-store), chunked.
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Email links come back as foodrescue:// deep links, handled in features/auth/deepLinks.ts.
      detectSessionInUrl: false,
    },
  },
);

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});
