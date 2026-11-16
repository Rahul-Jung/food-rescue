import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, Skeleton } from '../../components';
import { color, space } from '../../theme';
import type { NearbyOffer } from './api';
import { NearbyOfferCard } from './NearbyOfferCard';
import type { useNearbyOffers } from './hooks';

type Nearby = ReturnType<typeof useNearbyOffers>;

/** Infinite list of nearby offers: skeletons, pull to refresh, next page at the end. */
export function OfferList({
  nearby,
  header,
  empty,
}: {
  nearby: Nearby;
  header?: ReactElement;
  empty: ReactElement;
}) {
  const { t } = useTranslation();
  const { offers, isPending, isError, refetch, isRefetching, hasNextPage, isFetchingNextPage } =
    nearby;

  const body = isPending ? (
    <View style={styles.skeletons}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={112} />
      ))}
    </View>
  ) : isError && offers.length === 0 ? (
    <EmptyState
      title={t('discover.loadFailed')}
      actionLabel={t('common.retry')}
      onAction={() => void refetch()}
    />
  ) : (
    empty
  );

  return (
    <FlatList<NearbyOffer>
      data={offers}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) => <NearbyOfferCard offer={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={body}
      contentContainerStyle={styles.content}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) void nearby.fetchNextPage();
      }}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator color={color.ink} accessibilityLabel={t('common.loading')} />
        ) : hasNextPage && offers.length > 0 ? (
          <Button
            variant="ghost"
            label={t('discover.more')}
            onPress={() => void nearby.fetchNextPage()}
          />
        ) : undefined
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => void refetch()}
          tintColor={color.ink}
          colors={[color.ink]}
        />
      }
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: space.l, gap: space.m, flexGrow: 1 },
  skeletons: { gap: space.m },
});
