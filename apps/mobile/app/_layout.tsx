import i18n from '../src/lib/i18n';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, OfflineBanner, Text } from '../src/components';
import { posthog } from '../src/lib/analytics';
import { systemGate, useAppSettings } from '../src/lib/appSettings';
import { queryClient, queryPersister } from '../src/lib/queryClient';
import { initSentry, Sentry } from '../src/lib/sentry';
import { color, fontAssets, space } from '../src/theme';

initSentry();

function CrashScreen({ resetError }: { resetError: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.crash}>
      <Text variant="title" style={styles.center}>
        {t('errors.UNKNOWN')}
      </Text>
      <Button label={t('common.retry')} onPress={resetError} />
    </View>
  );
}

/** Sends the user to the update or maintenance screen when app_settings says so. */
function SystemGate({ children }: { children: ReactNode }) {
  const { data } = useAppSettings();
  const segments = useSegments();
  const gate = systemGate(data);
  const inSystem = segments[0] === '(system)';
  if (gate && !inSystem) return <Redirect href={gate === 'update' ? '/update' : '/maintenance'} />;
  if (!gate && inSystem) return <Redirect href="/" />;
  return children;
}

function Analytics({ children }: { children: ReactNode }) {
  if (!posthog) return children;
  return (
    <PostHogProvider
      client={posthog}
      autocapture={{ captureScreens: false, captureTouches: false }}
    >
      {children}
    </PostHogProvider>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // Drawn loading state instead of a blank screen; on a font error, carry on with system fonts.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading} accessibilityLabel={i18n.t('common.loading')}>
        <ActivityIndicator color={color.ink} size="large" />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <Sentry.ErrorBoundary fallback={({ resetError }) => <CrashScreen resetError={resetError} />}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: queryPersister }}
        >
          <Analytics>
            <StatusBar style="dark" />
            <OfflineBanner />
            <SystemGate>
              <Stack screenOptions={{ headerShown: false }} />
            </SystemGate>
          </Analytics>
        </PersistQueryClientProvider>
      </Sentry.ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.paper,
  },
  crash: {
    flex: 1,
    justifyContent: 'center',
    padding: space.xl,
    gap: space.l,
    backgroundColor: color.paper,
  },
  center: { textAlign: 'center' },
});
