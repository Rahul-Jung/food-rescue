import { formatPrice, formatTimeRange, toDigits } from '@food-rescue/shared';
import { useNetInfo } from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Card,
  Chip,
  Countdown,
  EmptyState,
  Skeleton,
  Stepper,
  Text,
} from '../../../src/components';
import { canReserve, createOrder, type CreatedOrder } from '../../../src/features/detail/api';
import { useOfferDetail } from '../../../src/features/detail/hooks';
import { OfferError } from '../../../src/features/offers/api';
import { useAppSettings } from '../../../src/lib/appSettings';
import { useOfferQuantity } from '../../../src/lib/realtime';
import { useLanguageStore } from '../../../src/store/language';
import { color, space } from '../../../src/theme';

type Wallet = 'esewa' | 'khalti';

/**
 * C-13 Checkout (C4, BR1): quantity stepper up to what is left (and the max
 * per order), server total, eSewa or Khalti, 10:00 hold countdown, and a
 * notice when the price changed. The amount always comes from the server.
 */
export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { offerId } = useLocalSearchParams<{ offerId: string }>();
  const { locale, digits } = useLanguageStore();
  const net = useNetInfo();
  const settings = useAppSettings();
  const q = useOfferDetail(offerId);
  const offer = q.data;
  const live = useOfferQuantity(offer?.id, offer?.quantity_left ?? null);
  const [qty, setQty] = useState(1);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [order, setOrder] = useState<(CreatedOrder & { until: Date; shownTotal: number }) | null>(
    null,
  );
  const [holdEnded, setHoldEnded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (q.isPending) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Skeleton height={80} />
          <Skeleton height={120} />
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
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const s = settings.data ?? {};
  const maxPerOrder = Number(s.max_order_qty_per_order ?? 5) || 5;
  const holdMinutes = Number(s.hold_minutes ?? 10) || 10;
  const paymentsOn = s.payments_enabled === true;
  const wallets: Wallet[] = (['esewa', 'khalti'] as Wallet[]).filter(
    (w) => s[`${w}_enabled`] === true,
  );

  const left = live.quantityLeft ?? offer.quantity_left ?? 0;
  const price = live.price ?? offer.price ?? 0;
  const max = Math.max(1, Math.min(left, maxPerOrder));
  const quantity = Math.min(qty, max);
  const shownTotal = price * quantity;
  const offline = net.isConnected === false;
  const bookable = canReserve({ ...offer, quantity_left: left });
  const title = locale === 'ne' && offer.title_ne ? offer.title_ne : offer.title;
  const fmt = (p: number) => formatPrice(p, locale, digits);
  const holding = !!order && !holdEnded;

  const reserve = async () => {
    setError(null);
    setBusy(true);
    try {
      const o = await createOrder(offer.id, quantity);
      // Count down by the server's clock, not the phone's.
      const until = new Date(
        Date.now() + (new Date(o.hold_expires_at).getTime() - new Date(o.server_now).getTime()),
      );
      setOrder({ ...o, until, shownTotal });
      setHoldEnded(false);
    } catch (e) {
      setError(t(`errors.${e instanceof OfferError ? e.code : 'UNKNOWN'}`));
      void q.refetch();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
        <Text variant="title" accessibilityRole="header">
          {t('checkout.title')}
        </Text>

        <Card>
          <Text variant="button">{title}</Text>
          <Text color="grey700">{offer.vendor.name}</Text>
          {offer.pickup_start && offer.pickup_end ? (
            <Text variant="caption" color="grey700">
              {t('offerDetail.pickup', {
                window: formatTimeRange(offer.pickup_start, offer.pickup_end, locale, digits),
              })}
            </Text>
          ) : null}
        </Card>

        {!holding ? (
          <View style={styles.block}>
            <Text weight={600}>{t('checkout.quantity')}</Text>
            <Stepper value={quantity} onChange={setQty} min={1} max={max} />
            <Text variant="caption" color="grey700">
              {t('checkout.limit', {
                left: toDigits(String(left), digits),
                max: toDigits(String(maxPerOrder), digits),
              })}
            </Text>
          </View>
        ) : null}

        <View style={styles.totalRow}>
          <Text weight={600}>{holding ? t('checkout.serverTotal') : t('checkout.total')}</Text>
          <Text variant="number" accessibilityLiveRegion="polite">
            {fmt(holding ? order!.total : shownTotal)}
          </Text>
        </View>
        <Text variant="caption" color="grey700">
          {t('checkout.unit', {
            price: fmt(holding ? order!.unit_price : price),
            n: toDigits(String(holding ? order!.quantity : quantity), digits),
          })}
        </Text>

        {holding && order!.total !== order!.shownTotal ? (
          <Card>
            <Text weight={600}>{`⚠ ${t('checkout.priceChanged')}`}</Text>
            <Text>{t('checkout.priceChangedBody', { total: fmt(order!.total) })}</Text>
          </Card>
        ) : null}

        {holding ? (
          <Card>
            <Text weight={600}>{t('checkout.held')}</Text>
            <Countdown until={order!.until} onDone={() => setHoldEnded(true)} />
          </Card>
        ) : holdEnded ? (
          <Text weight={600}>{`⚠ ${t('checkout.holdEnded')}`}</Text>
        ) : (
          <Text variant="caption" color="grey700">
            {t('checkout.holdInfo', { min: toDigits(String(holdMinutes), digits) })}
          </Text>
        )}

        <View style={styles.block}>
          <Text weight={600}>{t('checkout.wallet')}</Text>
          <View style={styles.chips}>
            {(['esewa', 'khalti'] as Wallet[]).map((w) => (
              <Chip
                key={w}
                label={t(`checkout.wallets.${w}`)}
                selected={wallet === w}
                onPress={() => setWallet(w)}
              />
            ))}
          </View>
          {!paymentsOn || wallets.length === 0 ? (
            <Text variant="caption" color="grey700">
              {t('checkout.paymentsSoon')}
            </Text>
          ) : null}
        </View>

        {error ? <Text weight={600}>{`⚠ ${error}`}</Text> : null}
        {offline ? (
          <Text variant="caption" color="grey700">{`⚠ ${t('offerDetail.offline')}`}</Text>
        ) : null}
        {!bookable && !holding ? (
          <Text variant="caption" color="grey700">
            {t('offerDetail.soldOutBody')}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {holding ? (
          <Button
            label={t('checkout.pay', { total: fmt(order!.total) })}
            disabled={offline || !paymentsOn || !wallet || !wallets.includes(wallet)}
          />
        ) : (
          <Button
            label={t('checkout.reserve')}
            loading={busy}
            disabled={offline || !bookable}
            onPress={() => void reserve()}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  content: { padding: space.l, gap: space.m },
  block: { gap: space.s },
  chips: { flexDirection: 'row', gap: space.s },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  footer: { padding: space.l, borderTopWidth: 1, borderTopColor: color.grey300 },
});
