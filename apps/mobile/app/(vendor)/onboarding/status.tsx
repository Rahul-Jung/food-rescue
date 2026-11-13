import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../../../src/components';
import { logout } from '../../../src/features/auth/logout';
import { useMyVendor } from '../../../src/features/vendor-onboarding/hooks';
import { color, space } from '../../../src/theme';

/**
 * V-05 Waiting for approval. Submitted: "1 to 2 working days". Rejected:
 * the reason + Edit and resubmit (back through the steps, then Submit).
 * Pull to refresh; the approval push / email also tells the vendor.
 */
export default function VendorStatusScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const vendor = useMyVendor();
  const v = vendor.data;
  const rejected = v?.status === 'rejected';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={vendor.isRefetching}
            onRefresh={() => void vendor.refetch()}
          />
        }
      >
        <Text variant="title" accessibilityRole="header">
          {rejected
            ? t('vendorOnboarding.status.rejectedTitle')
            : t('vendorOnboarding.status.submittedTitle')}
        </Text>
        {rejected ? (
          <>
            <Text>
              {t('vendorOnboarding.status.rejectedReason', { reason: v?.reject_reason ?? '' })}
            </Text>
            <Text color="grey700">{t('vendorOnboarding.status.rejectedHelp')}</Text>
            <Button
              label={t('vendorOnboarding.status.editResubmit')}
              onPress={() => router.push('/onboarding/profile')}
            />
          </>
        ) : (
          <>
            <Text>{t('vendorOnboarding.status.submittedBody')}</Text>
            <Text color="grey700">{t('vendorOnboarding.status.notifyHelp')}</Text>
          </>
        )}
        <Button
          variant="secondary"
          label={t('vendorOnboarding.status.check')}
          loading={vendor.isRefetching}
          onPress={() => void vendor.refetch()}
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
