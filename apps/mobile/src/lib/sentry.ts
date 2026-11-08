import * as Sentry from '@sentry/react-native';

import { env } from './env';

/** Off when no DSN is set, so local runs without an account still work. */
export function initSentry() {
  Sentry.init({
    dsn: env.sentryDsn || undefined,
    enabled: !!env.sentryDsn,
    environment: env.appEnv,
    sendDefaultPii: false, // N7: no phone, email or IP
    tracesSampleRate: env.appEnv === 'production' ? 0.1 : 1,
  });
}

export { Sentry };
