import Constants from 'expo-constants';

// Public config only (never secrets). Expo inlines EXPO_PUBLIC_* at build time,
// so each one must be read with a literal process.env.NAME.
export const env = {
  /** From app.config.ts extra (APP_ENV is not inlined into the bundle). */
  appEnv: String(Constants.expoConfig?.extra?.appEnv ?? 'local'),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
};
