import {
  discountPercent,
  formatTimeRange,
  rupeesToPaisa,
  validateOffer,
} from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Input, OfferCard, Text } from '../../../src/components';
import {
  createOffer,
  OfferError,
  saveOfferPhotos,
  setOfferStatus,
  type VendorOffer,
} from '../../../src/features/offers/api';
import { fieldError } from '../../../src/features/offers/fieldError';
import { useRefreshOffers } from '../../../src/features/offers/hooks';
import { serverFieldToForm } from '../../../src/features/offers/tabs';
import { useMyVendor } from '../../../src/features/vendor-onboarding/hooks';
import { useLanguageStore } from '../../../src/store/language';
import { useOfferDraftStore } from '../../../src/store/offerDraft';
import { color, space } from '../../../src/theme';

/**
 * V-09 New offer, price and pickup (2 of 2): discount % shown live, inline
 * errors for each V1 rule, preview, then publish. The offer stays a draft
 * until its photos are uploaded and confirmed (retry keeps the same draft).
 */
export default function NewOfferPrice() {
  const { t } = useTranslation();
  const router = useRouter();
  const { locale, digits } = useLanguageStore();
  const vendor = useMyVendor().data;
  const refresh = useRefreshOffers();
  const { draft, set, reset } = useOfferDraftStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  // Created on the first publish; a retry after a failed upload reuses it.
  const [created, setCreated] = useState<VendorOffer | null>(null);

  const original = rupeesToPaisa(draft.original_price);
  const price = rupeesToPaisa(draft.price);
  const pct = original && price ? discountPercent(original, price) : null;

  const check = () => {
    const r = validateOffer({ ...draft, photos: draft.photos.length });
    if (!r.ok) {
      setErrors(r.errors as Record<string, string>);
      return null;
    }
    setErrors({});
    return r.value;
  };

  const publish = async () => {
    setFormError(null);
    const value = check();
    if (!value) return;
    setBusy(true);
    let made = created;
    try {
      const offer = made ?? (await createOffer(value));
      made = offer;
      setCreated(offer);
      await saveOfferPhotos(
        offer,
        draft.photos.map((uri) => ({ kind: 'new' as const, uri })),
      );
      await setOfferStatus(offer.id, 'live');
      await refresh(offer.id);
      reset();
      router.replace('/offers');
    } catch (e) {
      const err = e instanceof OfferError ? e : null;
      const field = serverFieldToForm(err?.field ?? null);
      if (err?.code === 'VALIDATION_FAILED' && field) setErrors({ [field]: field });
      setFormError(
        made && err?.code !== 'VENDOR_NOT_APPROVED'
          ? t('vendorOffers.new.savedAsDraft')
          : t(`errors.${err?.code ?? 'UNKNOWN'}`),
      );
    } finally {
      setBusy(false);
    }
  };

  const times = validateOffer({ ...draft, photos: draft.photos.length });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
          <Text variant="caption" color="grey700">
            {t('vendorOnboarding.stepOf', { step: 2, total: 2 })}
          </Text>
          <Text variant="title" accessibilityRole="header">
            {t('vendorOffers.new.priceTitle')}
          </Text>

          <View style={styles.row}>
            <View style={styles.flex}>
              <Input
                label={t('vendorOffers.fields.originalPrice')}
                error={fieldError(t, errors.original_price)}
                value={draft.original_price}
                onChangeText={(v) => set({ original_price: v })}
                keyboardType="decimal-pad"
                maxLength={9}
              />
            </View>
            <View style={styles.flex}>
              <Input
                label={t('vendorOffers.fields.price')}
                error={fieldError(t, errors.price)}
                value={draft.price}
                onChangeText={(v) => set({ price: v })}
                keyboardType="decimal-pad"
                maxLength={9}
              />
            </View>
          </View>
          <Text variant="button" accessibilityLiveRegion="polite">
            {pct !== null
              ? t('vendorOffers.new.discount', { pct })
              : t('vendorOffers.new.discountNone')}
          </Text>

          <Input
            label={t('vendorOffers.fields.quantity')}
            error={fieldError(t, errors.quantity_total)}
            value={draft.quantity_total}
            onChangeText={(v) => set({ quantity_total: v })}
            keyboardType="number-pad"
            maxLength={3}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Input
                label={t('vendorOffers.fields.pickupStart')}
                error={fieldError(t, errors.pickup_start)}
                value={draft.pickup_start}
                onChangeText={(v) => set({ pickup_start: v })}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            <View style={styles.flex}>
              <Input
                label={t('vendorOffers.fields.pickupEnd')}
                error={fieldError(t, errors.pickup_end)}
                value={draft.pickup_end}
                onChangeText={(v) => set({ pickup_end: v })}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
          <Input
            label={t('vendorOffers.fields.expires')}
            hint={t('vendorOffers.fields.expiresHint')}
            error={fieldError(t, errors.expires_at)}
            value={draft.expires_at}
            onChangeText={(v) => set({ expires_at: v })}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
          {errors.photos ? <Text>{`⚠ ${fieldError(t, errors.photos)}`}</Text> : null}

          <Button
            variant="secondary"
            label={preview ? t('vendorOffers.new.hidePreview') : t('vendorOffers.new.preview')}
            onPress={() => setPreview((p) => !p)}
          />
          {preview && price ? (
            <OfferCard
              title={draft.title || '-'}
              vendorName={vendor?.name ?? ''}
              meta={
                times.ok
                  ? formatTimeRange(
                      times.value.pickup_start,
                      times.value.pickup_end,
                      locale,
                      digits,
                    )
                  : ''
              }
              pricePaisa={price}
              originalPaisa={original ?? undefined}
              badges={['live']}
            />
          ) : null}

          {formError ? <Text>{`⚠ ${formError}`}</Text> : null}
          <Button
            label={t('vendorOffers.new.publish')}
            loading={busy}
            onPress={() => void publish()}
          />
        </ScrollView>
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
