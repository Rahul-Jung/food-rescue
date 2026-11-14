import {
  discountPercent,
  FOOD_TYPES,
  nptClock,
  OFFER_PHOTOS_MAX,
  paisaToRupeesInput,
  rupeesToPaisa,
  validateOffer,
  type FoodType,
} from '@food-rescue/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Card, Chip, Input, Text } from '../../../../src/components';
import {
  OfferError,
  saveOfferPhotos,
  storedPhotos,
  updateOffer,
  type OfferPhoto,
} from '../../../../src/features/offers/api';
import { fieldError } from '../../../../src/features/offers/fieldError';
import { useOffer, useRefreshOffers } from '../../../../src/features/offers/hooks';
import { PhotoSlots } from '../../../../src/features/offers/PhotoSlots';
import { serverFieldToForm } from '../../../../src/features/offers/tabs';
import { color, space } from '../../../../src/theme';

/**
 * V-10 Edit offer: shows the reserved count; quantity can't go below it (V2);
 * once anyone has reserved, the pickup time can only be extended. Existing
 * orders keep their own price.
 */
export default function EditOfferScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const offer = useOffer(id);
  const refresh = useRefreshOffers();
  const o = offer.data;

  const [photos, setPhotos] = useState<OfferPhoto[]>([]);
  const [title, setTitle] = useState('');
  const [titleNe, setTitleNe] = useState('');
  const [foodType, setFoodType] = useState<FoodType | null>(null);
  const [ingredients, setIngredients] = useState('');
  const [weight, setWeight] = useState('');
  const [original, setOriginal] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [expires, setExpires] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!o || loaded) return;
    setPhotos(storedPhotos(o));
    setTitle(o.title);
    setTitleNe(o.title_ne ?? '');
    setFoodType(o.food_type);
    setIngredients(o.ingredients ?? '');
    setWeight(o.weight_g ? String(o.weight_g) : '');
    setOriginal(paisaToRupeesInput(o.original_price));
    setPrice(paisaToRupeesInput(o.price));
    setQuantity(String(o.quantity_total ?? ''));
    setStart(o.pickup_start ? nptClock(o.pickup_start) : '');
    setEnd(o.pickup_end ? nptClock(o.pickup_end) : '');
    setExpires(o.expires_at ? nptClock(o.expires_at) : '');
    setLoaded(true);
  }, [o, loaded]);

  const pct = (() => {
    const a = rupeesToPaisa(original);
    const b = rupeesToPaisa(price);
    return a && b ? discountPercent(a, b) : null;
  })();

  const save = async () => {
    if (!o) return;
    setFormError(null);
    const r = validateOffer(
      {
        title,
        title_ne: titleNe,
        ingredients,
        food_type: foodType,
        weight_g: weight,
        original_price: original,
        price,
        quantity_total: quantity,
        pickup_start: start,
        pickup_end: end,
        expires_at: expires,
        photos: photos.length,
      },
      new Date(),
      { minQuantity: o.quantity_reserved },
    );
    if (!r.ok) {
      setErrors(r.errors as Record<string, string>);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const saved = await updateOffer(o.id, o.version, r.value);
      await saveOfferPhotos(saved, photos);
      await refresh(o.id);
      router.back();
    } catch (e) {
      const err = e instanceof OfferError ? e : null;
      const field = serverFieldToForm(err?.field ?? null);
      if (err?.code === 'VALIDATION_FAILED' && field) {
        setErrors({ [field]: err.field === 'pickup_extend_only' ? 'pickup_extend_only' : field });
      }
      setFormError(t(`errors.${err?.code ?? 'UNKNOWN'}`));
      if (err?.code === 'STALE_VERSION') {
        setLoaded(false);
        void offer.refetch();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
          <Text variant="title" accessibilityRole="header">
            {t('vendorOffers.edit.title')}
          </Text>
          {o ? (
            <Card>
              <Text weight={600}>
                {t('vendorOffers.edit.reserved', { n: o.quantity_reserved })}
              </Text>
              {o.quantity_reserved > 0 ? (
                <Text color="grey700">{t('vendorOffers.edit.reservedRules')}</Text>
              ) : null}
            </Card>
          ) : null}

          <PhotoSlots
            photos={photos}
            onChange={setPhotos}
            max={OFFER_PHOTOS_MAX}
            error={fieldError(t, errors.photos)}
          />
          <Input
            label={t('vendorOffers.fields.title')}
            error={fieldError(t, errors.title)}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
          <Input
            label={t('vendorOffers.fields.titleNe')}
            hint={t('vendorOnboarding.optional')}
            value={titleNe}
            onChangeText={setTitleNe}
            maxLength={120}
          />
          <View style={styles.chips}>
            {FOOD_TYPES.map((f) => (
              <Chip
                key={f}
                label={t(`vendorOffers.foodTypes.${f}`)}
                selected={foodType === f}
                onPress={() => setFoodType(f)}
              />
            ))}
          </View>
          <Input
            label={t('vendorOffers.fields.ingredients')}
            hint={t('vendorOnboarding.optional')}
            value={ingredients}
            onChangeText={setIngredients}
            multiline
            maxLength={1000}
          />
          <Input
            label={t('vendorOffers.fields.weight')}
            hint={t('vendorOnboarding.optional')}
            error={fieldError(t, errors.weight_g)}
            value={weight}
            onChangeText={setWeight}
            keyboardType="number-pad"
            maxLength={6}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Input
                label={t('vendorOffers.fields.originalPrice')}
                error={fieldError(t, errors.original_price)}
                value={original}
                onChangeText={setOriginal}
                keyboardType="decimal-pad"
                maxLength={9}
              />
            </View>
            <View style={styles.flex}>
              <Input
                label={t('vendorOffers.fields.price')}
                error={fieldError(t, errors.price)}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                maxLength={9}
              />
            </View>
          </View>
          <Text variant="button">
            {pct !== null
              ? t('vendorOffers.new.discount', { pct })
              : t('vendorOffers.new.discountNone')}
          </Text>
          <Input
            label={t('vendorOffers.fields.quantity')}
            hint={
              o?.quantity_reserved
                ? t('vendorOffers.edit.quantityFloor', { n: o.quantity_reserved })
                : undefined
            }
            error={fieldError(t, errors.quantity_total)}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            maxLength={3}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Input
                label={t('vendorOffers.fields.pickupStart')}
                error={fieldError(t, errors.pickup_start)}
                value={start}
                onChangeText={setStart}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            <View style={styles.flex}>
              <Input
                label={t('vendorOffers.fields.pickupEnd')}
                error={fieldError(t, errors.pickup_end)}
                value={end}
                onChangeText={setEnd}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
          <Input
            label={t('vendorOffers.fields.expires')}
            hint={t('vendorOffers.fields.expiresHint')}
            error={fieldError(t, errors.expires_at)}
            value={expires}
            onChangeText={setExpires}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          {formError ? <Text>{`⚠ ${formError}`}</Text> : null}
          <Button
            label={t('vendorOffers.edit.save')}
            loading={busy}
            disabled={!o}
            onPress={() => void save()}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
});
