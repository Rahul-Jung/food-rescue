import { formatClock, formatTimeRange, toDigits } from '@food-rescue/shared';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Card,
  EmptyState,
  ListRow,
  OfferCard,
  Skeleton,
  Text,
  type BadgeKind,
} from '../../../src/components';
import { dealLabel } from '../../../src/features/detail/dealLabel';
import { useVendorPage } from '../../../src/features/detail/hooks';
import { OfferError } from '../../../src/features/offers/api';
import { env } from '../../../src/lib/env';
import { callPhone, openDirections } from '../../../src/lib/maps';
import { useLanguageStore } from '../../../src/store/language';
import { color, radius, space } from '../../../src/theme';

/**
 * C-11 Vendor page: rating, reviews (empty until S7), live offers and deals,
 * hours, map, Directions (Google Maps at the pin) and Call.
 */
export default function VendorPageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { locale, digits } = useLanguageStore();
  const q = useVendorPage(id);
  const v = q.data;

  if (q.isPending) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Skeleton height={32} />
          <Skeleton height={160} />
          <Skeleton height={112} />
        </View>
      </SafeAreaView>
    );
  }
  if (!v) {
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

  const hasPin = v.lat != null && v.lng != null;
  const mapAvailable = hasPin && (Platform.OS !== 'android' || env.googleMapsKey !== '');
  const byDay = new Map(v.hours.map((h) => [h.day_of_week, h]));
  const today = new Date(new Date(v.server_now).getTime() + (5 * 60 + 45) * 60_000).getUTCDay();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
        <Text variant="title" accessibilityRole="header">
          {v.name}
        </Text>
        <Text color="grey700">
          {[t(`vendorOnboarding.types.${v.type as VendorType}`), v.area]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <Text color="grey700">
          {v.rating_count > 0 && v.rating_avg != null
            ? t('vendorPage.rating', {
                avg: toDigits(v.rating_avg.toFixed(1), digits),
                count: v.rating_count,
              })
            : t('vendorPage.noRating')}
        </Text>
        {v.description ? <Text>{v.description}</Text> : null}

        <View style={styles.actions}>
          {hasPin ? (
            <View style={styles.action}>
              <Button
                label={t('vendorPage.directions')}
                onPress={() => openDirections(v.lat!, v.lng!, v.name)}
              />
            </View>
          ) : null}
          {v.phone ? (
            <View style={styles.action}>
              <Button
                variant="secondary"
                label={t('vendorPage.call')}
                onPress={() => callPhone(v.phone!)}
              />
            </View>
          ) : null}
        </View>

        {mapAvailable ? (
          <MapView
            style={styles.map}
            liteMode
            scrollEnabled={false}
            zoomEnabled={false}
            initialRegion={{
              latitude: v.lat!,
              longitude: v.lng!,
              latitudeDelta: 0.006,
              longitudeDelta: 0.006,
            }}
            accessibilityLabel={t('vendorPage.mapLabel', { name: v.name })}
          >
            <Marker coordinate={{ latitude: v.lat!, longitude: v.lng! }} />
          </MapView>
        ) : null}
        {v.address || v.landmark ? (
          <Text color="grey700">{[v.address, v.landmark].filter(Boolean).join(' · ')}</Text>
        ) : null}

        <Text weight={600} accessibilityRole="header">
          {t('vendorPage.offers')}
        </Text>
        {v.offers.length === 0 ? (
          <Text color="grey700">{t('vendorPage.noOffers')}</Text>
        ) : (
          v.offers.map((o) => {
            const soldOut = o.status === 'sold_out' || o.quantity_left === 0;
            const badges: BadgeKind[] = soldOut ? ['soldOut'] : [];
            return (
              <View key={o.id} style={soldOut && styles.greyed}>
                <OfferCard
                  title={locale === 'ne' && o.title_ne ? o.title_ne : o.title}
                  vendorName={v.name}
                  meta={[
                    o.pickup_start && o.pickup_end
                      ? t('discover.pickup', {
                          window: formatTimeRange(o.pickup_start, o.pickup_end, locale, digits),
                        })
                      : null,
                    o.quantity_left != null && !soldOut
                      ? t('discover.left', {
                          count: o.quantity_left,
                          n: toDigits(String(o.quantity_left), digits),
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  pricePaisa={o.price ?? undefined}
                  originalPaisa={o.original_price ?? undefined}
                  badges={badges}
                  onPress={() => router.push(`/offer/${o.id}` as Href)}
                />
              </View>
            );
          })
        )}

        <Text weight={600} accessibilityRole="header">
          {t('vendorPage.deals')}
        </Text>
        {v.deals.length === 0 ? (
          <Text color="grey700">{t('vendorPage.noDeals')}</Text>
        ) : (
          v.deals.map((d) => (
            <OfferCard
              key={d.id}
              title={locale === 'ne' && d.title_ne ? d.title_ne : d.title}
              vendorName={v.name}
              meta={dealLabel(d, t, locale, digits)}
              pricePaisa={d.price ?? undefined}
              originalPaisa={d.original_price ?? undefined}
              dealLabel={
                d.discount_pct
                  ? t('price.off', { pct: toDigits(String(d.discount_pct), digits) })
                  : undefined
              }
              badges={d.deal_live ? ['happyHour', 'live'] : ['happyHour']}
              onPress={() => router.push(`/deal/${d.id}` as Href)}
            />
          ))
        )}

        <Text weight={600} accessibilityRole="header">
          {t('vendorPage.hours')}
        </Text>
        <Card>
          {[0, 1, 2, 3, 4, 5, 6].map((d) => {
            const h = byDay.get(d);
            return (
              <View key={d} style={styles.hourRow}>
                <Text weight={d === today ? 600 : 400}>
                  {t(`business.days.${d as 0 | 1 | 2 | 3 | 4 | 5 | 6}`)}
                </Text>
                <Text weight={d === today ? 600 : 400} color={h ? 'ink' : 'grey500'}>
                  {h
                    ? `${formatClock(h.opens, locale, digits)} - ${formatClock(h.closes, locale, digits)}`
                    : t('business.closed')}
                </Text>
              </View>
            );
          })}
        </Card>

        <Text weight={600} accessibilityRole="header">
          {t('vendorPage.reviews')}
        </Text>
        {v.reviews.length === 0 ? (
          <Text color="grey700">{t('vendorPage.noReviews')}</Text>
        ) : (
          v.reviews.map((r) => (
            <ListRow key={r.id} title={'★'.repeat(r.rating)} subtitle={r.comment ?? undefined} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type VendorType = 'restaurant' | 'grocery' | 'bakery' | 'cafe' | 'hotel' | 'other';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  content: { padding: space.l, gap: space.m },
  actions: { flexDirection: 'row', gap: space.s },
  action: { flex: 1 },
  map: { height: 160, borderRadius: radius.box },
  greyed: { opacity: 0.5 },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
