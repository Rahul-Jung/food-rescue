import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Card, Text } from '../../../src/components';
import { logout } from '../../../src/features/auth/logout';
import { useMyVendor } from '../../../src/features/vendor-onboarding/hooks';
import { color, space } from '../../../src/theme';

/**
 * Vendor home for approved vendors (served at /vendor; the customer home owns
 * "/"). Offers, orders and wallet come in later sprints; S3 adds the business
 * profile (V-21) and the "under review" note after a name / PAN / pin edit.
 */
export default function VendorHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: vendor } = useMyVendor();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title" accessibilityRole="header">
          {vendor?.name || t('vendorHome.title')}
        </Text>
        {vendor?.pending_review ? (
          <Card>
            <Text weight={600}>{`⚠ ${t('vendorHome.underReview')}`}</Text>
            <Text color="grey700">{t('vendorHome.underReviewBody')}</Text>
          </Card>
        ) : null}
        <Text color="grey700">{t('vendorHome.body')}</Text>
        <Button
          variant="secondary"
          label={t('vendorHome.business')}
          onPress={() => router.push('/vendor/business')}
        />
        <Button variant="ghost" label={t('home.signOut')} onPress={() => void logout()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  content: { padding: space.xl, gap: space.l },
});
