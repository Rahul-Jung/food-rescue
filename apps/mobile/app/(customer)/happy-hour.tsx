import { useRouter, type Href } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, Skeleton, Text } from '../../src/components';
import { useNearbyOffers } from '../../src/features/discover/hooks';
import { NearbyOfferCard } from '../../src/features/discover/NearbyOfferCard';
import type { NearbyOffer } from '../../src/features/discover/api';
import { useFilterStore } from '../../src/store/filters';
import { color, space } from '../../src/theme';

/**
 * C-09 Happy hour now: only deals live right now inside the radius
 * (nearby_offers keeps happy hour to is_deal_live). Empty state suggests
 * surplus offers instead.
 */
export default function HappyHourScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setFilters = useFilterStore((s) => s.set);
  const deals = useNearbyOffers(
    { kind: 'happy_hour', foodType: null, vendorType: null, priceMin: null, priceMax: null, q: '' },
    { allPages: true },
  );

  const empty = deals.isPending ? (
    <View style={styles.list}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={112} />
      ))}
    </View>
  ) : deals.isError && deals.offers.length === 0 ? (
    <EmptyState
      title={t('discover.loadFailed')}
      actionLabel={t('common.retry')}
      onAction={() => void deals.refetch()}
    />
  ) : (
    <EmptyState
      title={t('happyHour.emptyTitle')}
      body={t('happyHour.emptyBody')}
      actionLabel={t('happyHour.seeSurplus')}
      onAction={() => {
        setFilters({ kind: 'surplus' });
        router.replace('/' as Href);
      }}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList<NearbyOffer>
        data={deals.offers}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => <NearbyOfferCard offer={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.back}>
              <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
            </View>
            <Text variant="title" accessibilityRole="header">
              {`☀ ${t('happyHour.title')}`}
            </Text>
            <Text color="grey700">{t('happyHour.body')}</Text>
          </View>
        }
        ListEmptyComponent={empty}
        refreshControl={
          <RefreshControl
            refreshing={deals.isRefetching}
            onRefresh={() => void deals.refetch()}
            tintColor={color.ink}
            colors={[color.ink]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start' },
  safe: { flex: 1, backgroundColor: color.paper },
  list: { padding: space.l, gap: space.m },
  header: { gap: space.s },
});
