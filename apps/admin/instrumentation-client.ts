import * as Sentry from '@sentry/nextjs';

// Browser-side Sentry; the DSN is public and comes from SENTRY_DSN via next.config.ts.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'local',
    tracesSampleRate: 0.2,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
