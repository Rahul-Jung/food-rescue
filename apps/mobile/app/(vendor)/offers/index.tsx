import { formatPrice, formatTimeRange } from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Badge, Button, Card, Chip, EmptyState, Text } from '../../../src/components';
import {
  OfferError,
  photoUrl,
  setOfferStatus,
  type OfferStatus,
  type VendorOffer,
} from '../../../src/features/offers/api';
import { useMyOffers, useRefreshOffers } from '../../../src/features/offers/hooks';
import { groupOffers, offerActions, type OfferTab } from '../../../src/features/offers/tabs';
import { useLanguageStore } from '../../../src/store/language';
import { color, radius, space } from '../../../src/theme';

/** V-07 My offers: Active / Happy hour / Past tabs; sold out, deactivate, delete. */
export default function MyOffersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { locale, digits } = useLanguageStore();
  const offers = useMyOffers();
  const refresh = useRefreshOffers();
  const [tab, setTab] = useState<OfferTab>('active');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const groups = groupOffers(offers.data ?? []);
  const list = groups[tab];

  const change = async (o: VendorOffer, status: OfferStatus) => {
    setBusy(o.id);
    setMessage(null);
    try {
      await setOfferStatus(o.id, status);
      await refresh(o.id);
    } catch (e) {
      const code = e instanceof OfferError ? e.code : 'UNKNOWN';
      setMessage(t(`errors.${code}`));
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = (o: VendorOffer) =>
    Alert.alert(t('vendorOffers.deleteTitle'), t('vendorOffers.deleteBody', { title: o.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('vendorOffers.actions.delete'),
        style: 'destructive',
        onPress: () => void change(o, 'deleted'),
      },
    ]);

  const meta = (o: VendorOffer) => {
    if (o.offer_kind === 'happy_hour') {
      return o.deal_discount_pct
        ? t('vendorOffers.dealPct', { pct: o.deal_discount_pct })
        : o.price
          ? formatPrice(o.price, locale, digits)
          : '';
    }
    const left = (o.quantity_total ?? 0) - o.quantity_reserved;
    const window =
      o.pickup_start && o.pickup_end
        ? formatTimeRange(o.pickup_start, o.pickup_end, locale, digits)
        : '';
    return `${o.price ? formatPrice(o.price, locale, digits) : ''} · ${t('vendorOffers.left', { n: left, total: o.quantity_total ?? 0 })} · ${window}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={offers.isRefetching}
            onRefresh={() => void offers.refetch()}
          />
        }
      >
        <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
        <Text variant="title" accessibilityRole="header">
          {t('vendorOffers.title')}
        </Text>
        <View style={styles.chips} accessibilityRole="tablist">
          {(['active', 'happy', 'past'] as const).map((k) => (
            <Chip
              key={k}
              label={`${t(`vendorOffers.tabs.${k}`)} (${groups[k].length})`}
              selected={tab === k}
              onPress={() => setTab(k)}
            />
          ))}
        </View>

        {tab === 'active' ? (
          <Button label={t('vendorOffers.newOffer')} onPress={() => router.push('/offers/new')} />
        ) : null}
        {tab === 'happy' ? (
          <Button label={t('vendorOffers.newDeal')} onPress={() => router.push('/deals/edit')} />
        ) : null}
        {message ? <Text>{`⚠ ${message}`}</Text> : null}

        {offers.isError ? (
          <Button label={t('common.retry')} onPress={() => void offers.refetch()} />
        ) : list.length === 0 && !offers.isLoading ? (
          <EmptyState title={t(`vendorOffers.empty.${tab}`)} />
        ) : (
          list.map((o) => {
            const a = offerActions(o);
            const first = [...o.offer_images].sort((x, y) => x.position - y.position)[0];
            const loading = busy === o.id;
            return (
              <Card key={o.id}>
                <View style={styles.cardTop}>
                  {first ? (
                    <Image source={{ uri: photoUrl(first.path, true) }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.noThumb]} />
                  )}
                  <View style={styles.flex}>
                    <Text variant="button" numberOfLines={2}>
                      {o.title}
                    </Text>
                    <Text variant="caption" color="grey700">
                      {meta(o)}
                    </Text>
                    <View style={styles.badges}>
                      {o.status === 'live' ? (
                        <Badge kind={o.offer_kind === 'happy_hour' ? 'happyHour' : 'live'} />
                      ) : o.status === 'sold_out' ? (
                        <Badge kind="soldOut" />
                      ) : (
                        <Text variant="caption" weight={600}>
                          {t(`vendorOffers.status.${o.status}`)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.actions}>
                  {a.publish ? (
                    <Button
                      label={t('vendorOffers.actions.publish')}
                      loading={loading}
                      onPress={() => void change(o, 'live')}
                    />
                  ) : null}
                  {a.edit ? (
                    <Button
                      variant="secondary"
                      label={t('vendorOffers.actions.edit')}
                      disabled={loading}
                      onPress={() =>
                        router.push(
                          o.offer_kind === 'happy_hour'
                            ? { pathname: '/deals/edit', params: { id: o.id } }
                            : { pathname: '/offers/[id]/edit', params: { id: o.id } },
                        )
                      }
                    />
                  ) : null}
                  {a.soldOut ? (
                    <Button
                      variant="secondary"
                      label={t('vendorOffers.actions.soldOut')}
                      disabled={loading}
                      onPress={() => void change(o, 'sold_out')}
                    />
                  ) : null}
                  {a.reopen ? (
                    <Button
                      variant="secondary"
                      label={t('vendorOffers.actions.reopen')}
                      disabled={loading}
                      onPress={() => void change(o, 'live')}
                    />
                  ) : null}
                  {a.deactivate ? (
                    <Button
                      variant="secondary"
                      label={
                        o.offer_kind === 'happy_hour'
                          ? t('vendorOffers.actions.pause')
                          : t('vendorOffers.actions.deactivate')
                      }
                      disabled={loading}
                      onPress={() => void change(o, 'deactivated')}
                    />
                  ) : null}
                  {a.reactivate ? (
                    <Button
                      variant="secondary"
                      label={
                        o.offer_kind === 'happy_hour'
                          ? t('vendorOffers.actions.resume')
                          : t('vendorOffers.actions.turnOn')
                      }
                      disabled={loading}
                      onPress={() => void change(o, 'live')}
                    />
                  ) : null}
                  {a.clone ? (
                    <Button
                      label={t('vendorOffers.actions.clone')}
                      disabled={loading}
                      onPress={() =>
                        router.push({ pathname: '/offers/past', params: { id: o.id } })
                      }
                    />
                  ) : null}
                  {a.delete ? (
                    <Button
                      variant="danger"
                      label={t('vendorOffers.actions.delete')}
                      disabled={loading}
                      onPress={() => confirmDelete(o)}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  flex: { flex: 1 },
  content: { padding: space.xl, gap: space.l },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  cardTop: { flexDirection: 'row', gap: space.m },
  thumb: { width: 64, height: 64, borderRadius: radius.box },
  noThumb: { borderWidth: 1, borderColor: color.grey300, backgroundColor: color.grey100 },
  badges: { flexDirection: 'row', gap: space.s, marginTop: space.xs },
  actions: { gap: space.s, marginTop: space.m },
});
