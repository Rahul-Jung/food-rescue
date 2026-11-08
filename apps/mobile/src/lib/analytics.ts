import PostHog from 'posthog-react-native';

import { env } from './env';
import { appStringStorage } from './storage';

/**
 * PostHog with person profiles only for identified users (N7). Events must
 * never carry phone, email or exact location. Null when no key is set.
 */
export const posthog = env.posthogKey
  ? new PostHog(env.posthogKey, {
      host: env.posthogHost,
      personProfiles: 'identified_only',
      captureAppLifecycleEvents: true,
      customStorage: appStringStorage,
    })
  : null;

export function track(event: string, properties?: Record<string, string | number | boolean>) {
  posthog?.capture(event, properties);
}
