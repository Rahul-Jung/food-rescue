import { formatTime, nptClock, pickupTimesToday } from '@food-rescue/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Card, ListRow, Text, TimeField, FormScrollView } from '../../../src/components';
import {
  cloneOffer,
  OfferError,
  saveOfferPhotos,
  setOfferStatus,
  type OfferPhoto,
  type VendorOffer,
} from '../../../src/features/offers/api';
import { useMyOffers, useRefreshOffers } from '../../../src/features/offers/hooks';
import { PhotoSlots } from '../../../src/features/offers/PhotoSlots';
import { groupOffers } from '../../../src/features/offers/tabs';
import { useLanguageStore } from '../../../src/store/language';
import { color, space } from '../../../src/theme';

/**
 * V-11 Re-activate a past offer (V4): one tap copies it with today's pickup
 * times (the same clock times as before). If the old photo is gone, it asks
 * for a new one before the copy goes live.
 */
export default function PastOffersScreen() {
  const { t } = useTranslation();
  const { locale, digits } = useLanguageStore();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const offers = useMyOffers();
  const refresh = useRefreshOffers();
  const past = useMemo(() => groupOffers(offers.data ?? []).past, [offers.data]);

  const [selected, setSelected] = useState<VendorOffer | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [expires, setExpires] = useState('');
  const [needPhoto, setNeedPhoto] = useState<VendorOffer | null>(null);
  const [photos, setPhotos] = useState<OfferPhoto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = (o: VendorOffer) => {
    setSelected(o);
    setMessage(null);
    setNeedPhoto(null);
    setStart(o.pickup_start ? nptClock(o.pickup_start) : '18:00');
    setEnd(o.pickup_end ? nptClock(o.pickup_end) : '20:00');
    setExpires(o.expires_at ? nptClock(o.expires_at) : '');
  };

  useEffect(() => {
    if (params.id && !selected) {
      const o = past.find((p) => p.id === params.id);
      if (o) choose(o);
    }
  }, [params.id, past, selected]);

  const reactivate = async () => {
    if (!selected) return;
    setMessage(null);
    const times = pickupTimesToday(start, end, expires || undefined);
    if (
      !times ||
      new Date(times.pickup_end) <= new Date() ||
      new Date(times.expires_at) <= new Date()
    ) {
      setMessage(t('vendorOffers.past.timesPassed'));
      return;
    }
    setBusy(true);
    try {
      // Photo check: the server copies only photos that still exist in
      // storage; with none left the copy stays a draft and we ask for one.
      const copy = await cloneOffer(selected.id, times);
      if (copy.status === 'live') {
        await refresh(copy.id);
        router.replace('/offers');
        return;
      }
      setNeedPhoto(copy);
      setPhotos([]);
      setMessage(t('vendorOffers.past.needPhoto'));
    } catch (e) {
      setMessage(t(`errors.${e instanceof OfferError ? e.code : 'UNKNOWN'}`));
    } finally {
      setBusy(false);
    }
  };

  const publishWithPhoto = async () => {
    if (!needPhoto || photos.length === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      await saveOfferPhotos(needPhoto, photos);
      await setOfferStatus(needPhoto.id, 'live');
      await refresh(needPhoto.id);
      router.replace('/offers');
    } catch (e) {
      setMessage(t(`errors.${e instanceof OfferError ? e.code : 'UNKNOWN'}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FormScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
          <Text variant="title" accessibilityRole="header">
            {t('vendorOffers.past.title')}
          </Text>

          {selected ? (
            <Card>
              <Text variant="button">{selected.title}</Text>
              <Text color="grey700">{t('vendorOffers.past.help')}</Text>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <TimeField
                    label={t('vendorOffers.fields.pickupStart')}
                    value={start}
                    onChange={setStart}
                  />
                </View>
                <View style={styles.flex}>
                  <TimeField
                    label={t('vendorOffers.fields.pickupEnd')}
                    value={end}
                    onChange={setEnd}
                  />
                </View>
              </View>
              <TimeField
                optional
                label={t('vendorOffers.fields.expires')}
                hint={t('vendorOffers.fields.expiresHint')}
                value={expires}
                onChange={setExpires}
              />
              {needPhoto ? (
                <>
                  <PhotoSlots photos={photos} onChange={setPhotos} max={3} />
                  <Button
                    label={t('vendorOffers.actions.publish')}
                    loading={busy}
                    disabled={photos.length === 0}
                    onPress={() => void publishWithPhoto()}
                  />
                </>
              ) : (
                <Button
                  label={t('vendorOffers.past.reactivate')}
                  loading={busy}
                  onPress={() => void reactivate()}
                />
              )}
            </Card>
          ) : null}
          {message ? <Text>{`⚠ ${message}`}</Text> : null}

          {past.length === 0 && !offers.isLoading ? (
            <Text color="grey700">{t('vendorOffers.empty.past')}</Text>
          ) : (
            past.map((o) => (
              <ListRow
                key={o.id}
                title={o.title}
                subtitle={
                  o.pickup_end
                    ? t('vendorOffers.past.lastTime', {
                        time: formatTime(o.pickup_end, locale, digits),
                      })
                    : undefined
                }
                onPress={() => choose(o)}
              />
            ))
          )}
        </FormScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  flex: { flex: 1 },
  content: { padding: space.xl, gap: space.l },
  row: { flexDirection: 'row', gap: space.m },
});
