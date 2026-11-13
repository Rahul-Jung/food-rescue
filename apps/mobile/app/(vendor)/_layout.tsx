import { Redirect, Stack, useSegments, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../../src/components';
import { logout } from '../../src/features/auth/logout';
import { startVendorSignup } from '../../src/features/vendor-onboarding/api';
import { useMyVendor } from '../../src/features/vendor-onboarding/hooks';
import { vendorRoute } from '../../src/features/vendor-onboarding/route';
import { color, space } from '../../src/theme';

/**
 * Vendor area. Routes by the vendor row's status (S3): a draft goes through
 * onboarding (V-02 to V-04), submitted / rejected see V-05, approved vendors
 * get the vendor screens.
 */
export default function VendorLayout() {
  const { t } = useTranslation();
  const segments = useSegments() as string[];
  const vendor = useMyVendor();
  const creating = useRef(false);

  // A vendor account without a vendor row (e.g. set up by an admin): create
  // the draft now, the same way V-01 does.
  const missing = vendor.isSuccess && vendor.data === null;
  useEffect(() => {
    if (!missing || creating.current) return;
    creating.current = true;
    startVendorSignup()
      .then(() => vendor.refetch())
      .finally(() => {
        creating.current = false;
      });
  }, [missing, vendor]);

  if (vendor.isError) {
    return (
      <View style={styles.center}>
        <Text variant="title" style={styles.text}>
          {t('errors.UNKNOWN')}
        </Text>
        <Button label={t('common.retry')} onPress={() => void vendor.refetch()} />
      </View>
    );
  }

  if (!vendor.data) {
    return (
      <View style={styles.center} accessibilityLabel={t('common.loading')}>
        <ActivityIndicator color={color.ink} size="large" />
      </View>
    );
  }

  if (vendor.data.status === 'suspended') {
    return (
      <View style={styles.center}>
        <Text variant="title" style={styles.text}>
          {t('blocked.title')}
        </Text>
        <Text color="grey700" style={styles.text}>
          {t('vendorOnboarding.suspended')}
        </Text>
        <Button variant="secondary" label={t('home.signOut')} onPress={() => void logout()} />
      </View>
    );
  }

  const screen = segments.slice(1).join('/') || 'vendor';
  const target = vendorRoute(vendor.data.status, screen);
  if (target) return <Redirect href={target as Href} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.m,
    padding: space.xl,
    backgroundColor: color.paper,
  },
  text: { textAlign: 'center' },
});
