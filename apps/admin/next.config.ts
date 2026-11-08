import type { NextConfig } from 'next';

const config: NextConfig = {
  // Shared package ships TypeScript source.
  transpilePackages: ['@food-rescue/shared'],
  // The Sentry DSN is public; expose the server value to the browser bundle too.
  env: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN ?? '',
    NEXT_PUBLIC_APP_ENV: process.env.APP_ENV ?? 'local',
  },
};

export default config;
