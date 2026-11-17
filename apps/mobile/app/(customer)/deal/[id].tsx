import { formatClock, formatPrice, toDigits } from '@food-rescue/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Badge, Button, Card, EmptyState, Skeleton, Text } from '../../../src/components';
import { dealLabel } from '../../../src/features/detail/dealLabel';
import { offerDetailKey, useNowPassing, useOfferDetail } from '../../../src/features/detail/hooks';
import { OfferError, photoUrl } from '../../../src/features/offers/api';
import { useLanguageStore } from '../../../src/store/language';
import { color, radius, space } from '../../../src/theme';

/**
 * C-12 Happy hour deal pass (H1, H3): "Live until 7:00 PM", or "Starts at
 * 5:00 PM" / "Starts tomorrow" outside its hours; a full-screen pass to show
 * staff. A deal that ends while open flips to "ended" without a reload.
 */
export default function DealPassScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { locale, digits } = useLanguageStore();
  const q = useOfferDetail(id);
  const deal = q.data;
  const [full, setFull] = useState(false);

  // Tick at the window's end (or next start) so the label and pass update.
  const now = useNowPassing(deal?.live_until ?? deal?.next_start);
  const liveNow = !!deal?.live_until && new Date(deal.live_until).getTime() > now;
  const startPassed = !liveNow && !!deal?.next_start && new Date(deal.next_start).getTime() <= now;
  const [endedSeen, setEndedSeen] = useState(false);

  useEffect(() => {
    if (!deal) return;
    if (deal.live_until && !liveNow) setEndedSeen(true);
    if (liveNow) setEndedSeen(false);
    // A window opened or closed while the screen was open: ask the server again.
    if ((deal.live_until && !liveNow) || startPassed) {
      if (id) void qc.invalidateQueries({ queryKey: offerDetailKey(id) });
    }
  }, [deal, liveNow, startPassed, id, qc]);
  useEffect(() => {
    if (!liveNow) setFull(false);
  }, [liveNow]);

  // Offline and never opened before: nothing saved to show.
  if (q.isPending && q.fetchStatus === 'paused') {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          title={t('offerDetail.offlineNoData')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }
  if (q.isPending) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Skeleton height={200} />
          <Skeleton height={60} />
        </View>
      </SafeAreaView>
    );
  }
  if (!deal) {
    const code = q.error instanceof OfferError ? q.error.code : 'UNKNOWN';
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          title={t(`errors.${code}`)}
          actionLabel={code === 'OFFER_UNAVAILABLE' ? t('common.back') : t('common.retry')}
          onAction={() => (code === 'OFFER_UNAVAILABLE' ? router.back() : void q.refetch())}
        />
      </SafeAreaView>
    );
  }

  const title = locale === 'ne' && deal.title_ne ? deal.title_ne : deal.title;
  const offer =
    deal.price != null
      ? formatPrice(deal.price, locale, digits)
      : deal.discount_pct
        ? t('price.off', { pct: toDigits(String(deal.discount_pct), digits) })
        : '';
  const timing = dealLabel(deal, t, locale, digits, new Date(now));
  const label = endedSeen && !liveNow ? `${t('deal.ended')} · ${timing}` : timing;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.back}>
          <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
        </View>
        {deal.images[0] ? (
          <Image
            source={{ uri: photoUrl(deal.images[0].path) }}
            style={styles.photo}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <View style={styles.badges}>
          <Badge kind="happyHour" />
          {liveNow ? <Badge kind="live" /> : null}
        </View>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="number">{offer}</Text>
        {deal.price != null && deal.original_price ? (
          <Text color="grey500" strike>
            {formatPrice(deal.original_price, locale, digits)}
          </Text>
        ) : null}
        <Text weight={600} accessibilityLiveRegion="polite">
          {liveNow ? `● ${label}` : `○ ${label}`}
        </Text>
        {deal.description ? <Text>{deal.description}</Text> : null}

        <Card>
          <Text weight={600}>{t('deal.hours')}</Text>
          {deal.schedules.map((s, i) => (
            <View key={`${s.day_of_week}-${s.start_time}-${i}`} style={styles.row}>
              <Text>{t(`business.days.${s.day_of_week as 0 | 1 | 2 | 3 | 4 | 5 | 6}`)}</Text>
              <Text>{`${formatClock(s.start_time, locale, digits)} - ${formatClock(s.end_time, locale, digits)}`}</Text>
            </View>
          ))}
        </Card>

        <Card
          onPress={() => router.push(`/vendor/${deal.vendor.id}` as Href)}
          accessibilityLabel={deal.vendor.name}
        >
          <Text variant="caption" color="grey500">
            {t('offerDetail.from')}
          </Text>
          <Text variant="button">{deal.vendor.name}</Text>
          <Text variant="caption" color="grey700">{`${t('offerDetail.seeVendor')} ›`}</Text>
        </Card>
        <Text variant="caption" color="grey700">
          {t('deal.noPayment')}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button label={t('deal.showPass')} disabled={!liveNow} onPress={() => setFull(true)} />
      </View>

      <Modal visible={full} animationType="fade" onRequestClose={() => setFull(false)}>
        <Pressable
          style={styles.pass}
          onPress={() => setFull(false)}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Text variant="caption" color="paper">
            {t('deal.passFor')}
          </Text>
          <Text variant="number" color="paper" style={styles.center}>
            {title}
          </Text>
          <Text variant="number" color="paper">
            {offer}
          </Text>
          <Text color="paper">{deal.vendor.name}</Text>
          <Text weight={600} color="paper">
            {label}
          </Text>
          <Text variant="caption" color="paper">
            {t('deal.tapToClose')}
          </Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start' },
  safe: { flex: 1, backgroundColor: color.paper },
  content: { padding: space.l, gap: space.m },
  photo: { height: 200, borderRadius: radius.box, backgroundColor: color.grey100 },
  badges: { flexDirection: 'row', gap: space.s },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: { padding: space.l, borderTopWidth: 1, borderTopColor: color.grey300 },
  pass: {
    flex: 1,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.l,
    padding: space.xl,
  },
  center: { textAlign: 'center' },
});
