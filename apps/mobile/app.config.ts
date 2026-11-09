import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_ENV = process.env.APP_ENV ?? 'local';
const suffix = APP_ENV === 'production' ? '' : `.${APP_ENV}`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_ENV === 'production' ? 'Food Rescue' : `Food Rescue (${APP_ENV})`,
  slug: 'food-rescue',
  scheme: 'foodrescue',
  version: '0.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  android: {
    package: `np.foodrescue.app${suffix}`,
  },
  ios: {
    bundleIdentifier: `np.foodrescue.app${suffix}`,
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-secure-store',
    '@sentry/react-native/expo',
    [
      'expo-location',
      {
        // C-05: foreground only; used per search and never stored.
        locationWhenInUsePermission:
          'Food Rescue uses your location only to show food offers near you. It is never saved.',
        isAndroidBackgroundLocationEnabled: false,
        isIosBackgroundLocationEnabled: false,
      },
    ],
  ],
  experiments: { typedRoutes: true },
  owner: 'kairo10',
  extra: {
    appEnv: APP_ENV,
    eas: { projectId: 'e80a4eed-9496-406f-a02a-2dfd24f89a65' },
  },
});
