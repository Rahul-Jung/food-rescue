import { formatPrice, formatTimeRange, toDigits } from '@food-rescue/shared';
import { useNetInfo } from '@react-native-community/netinfo';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Image, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Badge, Button, Card, EmptyState, PriceTag, Skeleton, Text } from '../../../src/components';
import { canReserve } from '../../../src/features/detail/api';
import { useNowPassing, useOfferDetail } from '../../../src/features/detail/hooks';
import { OfferError, photoUrl } from '../../../src/features/offers/api';
import { useOfferQuantity } from '../../../src/lib/realtime';
import { useLanguageStore } from '../../../src/store/language';
import { color, radius, space } from '../../../src/theme';

/**
 * C-10 Offer detail (surplus): photos, price, discount %, quantity left
 * (live), pickup window, vendor card. Sold out or expired disables Reserve,
 * also for a copy opened from the cache while offline.
 */
export default function OfferDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { locale, digits } = useLanguageStore();
  const { width } = useWindowDimensions();
  const net = useNetInfo();
  const q = useOfferDetail(id);
  const offer = q.data;
  const live = useOfferQuantity(
    offer?.offer_kind === 'surplus' ? offer.id : null,
    offer?.quantity_left ?? null,
  );
  // Re-check at expiry so the button turns off while the screen is open.
  useNowPassing(offer?.expires_at);

  if (q.isPending) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Skeleton height={220} />
          <Skeleton height={28} />
          <Skeleton height={80} />
        </View>
      </SafeAreaView>
    );
  }
  if (!offer) {
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

  // A deal opened by its id shows as a deal pass instead.
  if (offer.offer_kind === 'happy_hour') return <Redirect href={`/deal/${offer.id}` as Href} />;

  const left = live.quantityLeft ?? offer.quantity_left;
  const status = live.status === 'sold_out' || left === 0 ? 'sold_out' : offer.status;
  const view = { ...offer, status, quantity_left: left };
  const bookable = canReserve(view);
  const expired =
    offer.status === 'expired' ||
    (!!offer.expires_at && new Date(offer.expires_at).getTime() <= Date.now());
  const offline = net.isConnected === false;
  const title = locale === 'ne' && offer.title_ne ? offer.title_ne : offer.title;
  const v = offer.vendor;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />

        {offer.images.length ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {offer.images.map((img) => (
              <Image
                key={img.path}
                source={{ uri: photoUrl(img.path) }}
                style={[styles.photo, { width: width - space.l * 2 }]}
                accessibilityLabel={t('offerDetail.photo', {
                  n: toDigits(String(img.position + 1), digits),
                })}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Text color="grey500">{t('offerDetail.noPhoto')}</Text>
          </View>
        )}

        <View style={styles.badges}>
          {expired ? (
            <Text weight={600}>{`✕ ${t('offerDetail.expired')}`}</Text>
          ) : status === 'sold_out' ? (
            <Badge kind="soldOut" />
          ) : (
            <Badge kind="live" />
          )}
        </View>

        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {offer.price != null ? (
          <PriceTag pricePaisa={offer.price} originalPaisa={offer.original_price ?? undefined} />
        ) : null}

        <View style={styles.facts}>
          {offer.pickup_start && offer.pickup_end ? (
            <Text>
              {t('offerDetail.pickup', {
                window: formatTimeRange(offer.pickup_start, offer.pickup_end, locale, digits),
              })}
            </Text>
          ) : null}
          {left != null && !expired ? (
            <Text weight={600} accessibilityLiveRegion="polite">
              {left > 0
                ? t('offerDetail.left', { count: left, n: toDigits(String(left), digits) })
                : t('offerDetail.noneLeft')}
            </Text>
          ) : null}
          {offer.food_type ? (
            <Text color="grey700">{t(`vendorOffers.foodTypes.${offer.food_type}`)}</Text>
          ) : null}
          {offer.weight_g ? (
            <Text color="grey700">
              {t('offerDetail.weight', { g: toDigits(String(offer.weight_g), digits) })}
            </Text>
          ) : null}
        </View>

        {offer.description ? <Text>{offer.description}</Text> : null}
        {offer.ingredients ? (
          <View style={styles.block}>
            <Text weight={600}>{t('offerDetail.ingredients')}</Text>
            <Text color="grey700">{offer.ingredients}</Text>
          </View>
        ) : null}

        <Card onPress={() => router.push(`/vendor/${v.id}` as Href)} accessibilityLabel={v.name}>
          <Text variant="caption" color="grey500">
            {t('offerDetail.from')}
          </Text>
          <Text variant="button">{v.name}</Text>
          {v.area || v.landmark ? (
            <Text color="grey700">{[v.area, v.landmark].filter(Boolean).join(' · ')}</Text>
          ) : null}
          <Text variant="caption" color="grey700">{`${t('offerDetail.seeVendor')} ›`}</Text>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        {offline ? (
          <Text variant="caption" color="grey700">{`⚠ ${t('offerDetail.offline')}`}</Text>
        ) : !bookable ? (
          <Text variant="caption" color="grey700">
            {expired ? t('offerDetail.expiredBody') : t('offerDetail.soldOutBody')}
          </Text>
        ) : offer.price != null ? (
          <Text variant="caption" color="grey700">
            {t('offerDetail.from_price', { price: formatPrice(offer.price, locale, digits) })}
          </Text>
        ) : null}
        <Button
          label={t('offerDetail.reserve')}
          disabled={!bookable || offline}
          onPress={() => router.push(`/checkout/${offer.id}` as Href)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  content: { padding: space.l, gap: space.m },
  photo: { height: 220, borderRadius: radius.box, backgroundColor: color.grey100 },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', gap: space.s },
  facts: { gap: space.xs },
  block: { gap: space.xs },
  footer: {
    padding: space.l,
    gap: space.s,
    borderTopWidth: 1,
    borderTopColor: color.grey300,
    backgroundColor: color.paper,
  },
});
