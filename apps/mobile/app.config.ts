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
    [
      'expo-image-picker',
      {
        // T3.2: logo and food photos; nothing is uploaded without the user picking it.
        photosPermission: 'Food Rescue uses your photos so you can add a logo or food pictures.',
        cameraPermission: 'Food Rescue uses the camera so you can take food pictures.',
        microphonePermission: false,
      },
    ],
    // react-native-maps (V-03, C-07): Google Maps on Android with a key
    // restricted to the package + SHA-1; iOS uses Apple Maps (free).
    [
      'react-native-maps',
      { androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '' },
    ],
    // T3.7: push notifications (Expo push service).
    ['expo-notifications', { color: '#000000' }],
  ],
  experiments: { typedRoutes: true },
  owner: 'kairo10',
  extra: {
    appEnv: APP_ENV,
    eas: { projectId: 'e80a4eed-9496-406f-a02a-2dfd24f89a65' },
  },
});
