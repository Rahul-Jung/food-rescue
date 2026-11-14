import { formatPrice, toDigits } from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Card, StatTile, Text } from '../../../src/components';
import { logout } from '../../../src/features/auth/logout';
import { useDashboard } from '../../../src/features/offers/hooks';
import { useMyVendor } from '../../../src/features/vendor-onboarding/hooks';
import { useLanguageStore } from '../../../src/store/language';
import { color, space } from '../../../src/theme';

/**
 * V-06 Dashboard (today), first version (T4.8): active offers, live deals,
 * rating placeholder and the strikes warning, from vendor_dashboard. Pickups,
 * collected and balances fill in when orders and the wallet arrive (S6).
 * Served at /vendor because the customer home owns "/".
 */
export default function VendorDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { locale, digits } = useLanguageStore();
  const { data: vendor } = useMyVendor();
  const dash = useDashboard();
  const d = dash.data;
  const n = (v: number | undefined) => toDigits(String(v ?? 0), digits);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={dash.isRefetching} onRefresh={() => void dash.refetch()} />
        }
      >
        <Text variant="title" accessibilityRole="header">
          {vendor?.name || t('vendorHome.title')}
        </Text>
        {vendor?.pending_review ? (
          <Card>
            <Text weight={600}>{`⚠ ${t('vendorHome.underReview')}`}</Text>
            <Text color="grey700">{t('vendorHome.underReviewBody')}</Text>
          </Card>
        ) : null}
        {d && d.strikes_30d > 0 ? (
          <Card>
            <Text weight={600}>{`⚠ ${t('dashboard.strikes', { n: n(d.strikes_30d) })}`}</Text>
            <Text color="grey700">{t('dashboard.strikesBody')}</Text>
          </Card>
        ) : null}

        <Text variant="caption" color="grey700">
          {t('dashboard.today')}
        </Text>
        <View style={styles.grid}>
          <View style={styles.cell}>
            <StatTile label={t('dashboard.activeOffers')} value={n(d?.active_offers)} />
          </View>
          <View style={styles.cell}>
            <StatTile label={t('dashboard.liveDeals')} value={n(d?.live_deals)} />
          </View>
          <View style={styles.cell}>
            <StatTile label={t('dashboard.pickups')} value={n(d?.pickups_today)} />
          </View>
          <View style={styles.cell}>
            <StatTile label={t('dashboard.collected')} value={n(d?.collected_today)} />
          </View>
          <View style={styles.cell}>
            <StatTile
              label={t('dashboard.available')}
              value={formatPrice(d?.available_paisa ?? 0, locale, digits)}
            />
          </View>
          <View style={styles.cell}>
            <StatTile
              label={t('dashboard.pending')}
              value={formatPrice(d?.pending_paisa ?? 0, locale, digits)}
            />
          </View>
          <View style={styles.cell}>
            <StatTile
              label={t('dashboard.rating')}
              value={d?.rating_avg ? toDigits(d.rating_avg.toFixed(1), digits) : '-'}
            />
          </View>
        </View>
        <Text variant="caption" color="grey700">
          {t('dashboard.comingSoon')}
        </Text>

        <Button label={t('vendorOffers.newOffer')} onPress={() => router.push('/offers/new')} />
        <Button
          variant="secondary"
          label={t('vendorOffers.title')}
          onPress={() => router.push('/offers')}
        />
        <Button
          variant="secondary"
          label={t('vendorOffers.newDeal')}
          onPress={() => router.push('/deals/edit')}
        />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  cell: { width: '47%' },
});
