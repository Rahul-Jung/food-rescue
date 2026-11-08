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
  plugins: ['expo-router', 'expo-dev-client'],
  experiments: { typedRoutes: true },
  extra: { appEnv: APP_ENV },
});
