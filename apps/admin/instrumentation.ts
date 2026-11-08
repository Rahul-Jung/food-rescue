import * as Sentry from '@sentry/nextjs';

// Server-side Sentry. Off when SENTRY_DSN is empty. Source-map upload is not
// configured yet (needs a Sentry auth token); stack traces may be minified.
export function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? 'local',
    tracesSampleRate: 0.2,
  });
}

export const onRequestError = Sentry.captureRequestError;
