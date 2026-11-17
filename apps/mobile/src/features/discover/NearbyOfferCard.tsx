import { formatDistance, formatTimeRange, toDigits } from '@food-rescue/shared';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OfferCard, type BadgeKind } from '../../components';
import { useLanguageStore } from '../../store/language';
import type { NearbyOffer } from './api';

/** One nearby_offers row as an OfferCard: title in the user's language, pickup window, distance, left. */
export function NearbyOfferCard({
  offer,
  quantityLeft,
  onPress,
}: {
  offer: NearbyOffer;
  /** Live value from useOfferQuantity, when the screen has one. */
  quantityLeft?: number | null;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { locale, digits } = useLanguageStore();
  const title = locale === 'ne' && offer.title_ne ? offer.title_ne : offer.title;
  const distance = formatDistance(offer.distance_m, locale, digits);
  const left = quantityLeft !== undefined ? quantityLeft : offer.quantity_left;

  const isDeal = offer.offer_kind === 'happy_hour';
  const parts = isDeal
    ? [t('discover.liveNow'), distance]
    : [
        offer.pickup_start && offer.pickup_end
          ? t('discover.pickup', {
              window: formatTimeRange(offer.pickup_start, offer.pickup_end, locale, digits),
            })
          : null,
        distance,
        left != null
          ? t('discover.left', { count: left, n: toDigits(String(left), digits) })
          : null,
      ];
  const badges: BadgeKind[] = isDeal ? ['happyHour', 'live'] : left === 0 ? ['soldOut'] : [];

  return (
    <OfferCard
      title={title}
      vendorName={offer.vendor_name}
      meta={parts.filter(Boolean).join(' · ')}
      pricePaisa={offer.price}
      originalPaisa={offer.original_price ?? undefined}
      dealLabel={
        offer.discount_pct
          ? t('price.off', { pct: toDigits(String(offer.discount_pct), digits) })
          : undefined
      }
      badges={badges}
      onPress={
        onPress ??
        // C-10 offer detail for surplus, C-12 deal pass for happy hour.
        (() =>
          router.push(
            (offer.offer_kind === 'happy_hour'
              ? `/deal/${offer.id}`
              : `/offer/${offer.id}`) as Href,
          ))
      }
    />
  );
}
