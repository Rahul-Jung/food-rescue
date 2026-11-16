import { FOOD_TYPES, OFFER_PHOTOS_MAX, OFFER_TITLE_MAX } from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Chip, Input, Text, FormScrollView } from '../../../src/components';
import { fieldError } from '../../../src/features/offers/fieldError';
import { PhotoSlots } from '../../../src/features/offers/PhotoSlots';
import { useOfferDraftStore } from '../../../src/store/offerDraft';
import { color, space } from '../../../src/theme';

/** V-08 New offer, details (1 of 2): photos (up to 3), name, Nepali name, food type, ingredients, weight. */
export default function NewOfferDetails() {
  const { t } = useTranslation();
  const router = useRouter();
  const { draft, set, reset } = useOfferDraftStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const next = () => {
    const e: Record<string, string> = {};
    const title = draft.title.trim();
    if (title.length < 2 || title.length > OFFER_TITLE_MAX) e.title = 'title';
    if (!draft.food_type) e.food_type = 'food_type';
    if (draft.photos.length < 1) e.photos = 'photos';
    if (draft.weight_g.trim()) {
      const w = Number(draft.weight_g.trim());
      if (!Number.isInteger(w) || w < 1 || w > 100000) e.weight_g = 'weight_g';
    }
    setErrors(e);
    if (Object.keys(e).length === 0) router.push('/offers/new-price');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FormScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Button
            variant="ghost"
            label={t('common.cancel')}
            onPress={() => {
              reset();
              router.back();
            }}
          />
          <Text variant="caption" color="grey700">
            {t('vendorOnboarding.stepOf', { step: 1, total: 2 })}
          </Text>
          <Text variant="title" accessibilityRole="header">
            {t('vendorOffers.new.title')}
          </Text>

          <PhotoSlots
            photos={draft.photos.map((uri) => ({ kind: 'new' as const, uri }))}
            onChange={(next) =>
              set({ photos: next.flatMap((p) => (p.kind === 'new' ? [p.uri] : [])) })
            }
            max={OFFER_PHOTOS_MAX}
            error={fieldError(t, errors.photos)}
          />
          <Input
            label={t('vendorOffers.fields.title')}
            error={fieldError(t, errors.title)}
            value={draft.title}
            onChangeText={(v) => set({ title: v })}
            maxLength={OFFER_TITLE_MAX}
          />
          <Input
            label={t('vendorOffers.fields.titleNe')}
            hint={t('vendorOnboarding.optional')}
            value={draft.title_ne}
            onChangeText={(v) => set({ title_ne: v })}
            maxLength={OFFER_TITLE_MAX}
          />
          <Text variant="caption" weight={600}>
            {t('vendorOffers.fields.foodType')}
          </Text>
          <View style={styles.chips}>
            {FOOD_TYPES.map((f) => (
              <Chip
                key={f}
                label={t(`vendorOffers.foodTypes.${f}`)}
                selected={draft.food_type === f}
                onPress={() => set({ food_type: f })}
              />
            ))}
          </View>
          {errors.food_type ? <Text>{`⚠ ${fieldError(t, errors.food_type)}`}</Text> : null}
          <Input
            label={t('vendorOffers.fields.ingredients')}
            hint={t('vendorOnboarding.optional')}
            value={draft.ingredients}
            onChangeText={(v) => set({ ingredients: v })}
            multiline
            maxLength={1000}
          />
          <Input
            label={t('vendorOffers.fields.weight')}
            hint={t('vendorOnboarding.optional')}
            error={fieldError(t, errors.weight_g)}
            value={draft.weight_g}
            onChangeText={(v) => set({ weight_g: v })}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button label={t('vendorOffers.new.next')} onPress={next} />
        </FormScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  flex: { flex: 1 },
  content: { padding: space.xl, gap: space.l },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
});
