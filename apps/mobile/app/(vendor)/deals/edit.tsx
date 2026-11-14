import {
  dealWindowLive,
  paisaToRupeesInput,
  validateDeal,
  windowsToForm,
  type DealForm,
} from '@food-rescue/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Chip, Input, Text } from '../../../src/components';
import {
  OfferError,
  saveOfferPhotos,
  setOfferStatus,
  storedPhotos,
  upsertDeal,
  type OfferPhoto,
} from '../../../src/features/offers/api';
import { fieldError } from '../../../src/features/offers/fieldError';
import { useOffer, useRefreshOffers } from '../../../src/features/offers/hooks';
import { PhotoSlots } from '../../../src/features/offers/PhotoSlots';
import { serverFieldToForm } from '../../../src/features/offers/tabs';
import { color, space } from '../../../src/theme';

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/**
 * V-12 New / edit happy hour deal (H1, BR14): discount % or deal price, days
 * chips, several windows (crossing midnight allowed), pause. Shown to
 * customers only during its hours; no payment or commission.
 */
export default function DealEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useOffer(id);
  const refresh = useRefreshOffers();
  const o = existing.data;

  const [photos, setPhotos] = useState<OfferPhoto[]>([]);
  const [form, setForm] = useState<Omit<DealForm, 'photos'>>({
    title: '',
    title_ne: '',
    description: '',
    mode: 'percent',
    discount_pct: '',
    original_price: '',
    price: '',
    days: [5, 6],
    times: [{ start: '17:00', end: '19:00' }],
  });
  const [paused, setPaused] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    if (!o || loaded) return;
    const w = windowsToForm(o.deal_schedules);
    setPhotos(storedPhotos(o));
    setForm({
      title: o.title,
      title_ne: o.title_ne ?? '',
      description: o.description ?? '',
      mode: o.deal_discount_pct ? 'percent' : 'price',
      discount_pct: o.deal_discount_pct ? String(o.deal_discount_pct) : '',
      original_price: paisaToRupeesInput(o.original_price),
      price: paisaToRupeesInput(o.price),
      days: w.days.length ? w.days : [5, 6],
      times: w.times.length ? w.times : [{ start: '17:00', end: '19:00' }],
    });
    setPaused(o.status === 'deactivated');
    setLoaded(true);
  }, [o, loaded]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const toggleDay = (d: number) =>
    set({ days: form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d] });
  const setTime = (i: number, patch: Partial<{ start: string; end: string }>) =>
    set({ times: form.times.map((w, j) => (j === i ? { ...w, ...patch } : w)) });

  const liveNow =
    !paused && o?.status === 'live' && o.deal_schedules.some((w) => dealWindowLive(w));

  const save = async () => {
    setFormError(null);
    const r = validateDeal({ ...form, photos: photos.length });
    if (!r.ok) {
      setErrors(r.errors as Record<string, string>);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const deal = await upsertDeal(id ?? null, r.value, o?.version);
      await saveOfferPhotos(deal, photos);
      const want = paused ? 'deactivated' : 'live';
      if (deal.status !== want && !(paused && deal.status === 'draft')) {
        await setOfferStatus(deal.id, want);
      }
      await refresh(deal.id);
      router.back();
    } catch (e) {
      const err = e instanceof OfferError ? e : null;
      const field = serverFieldToForm(err?.field ?? null);
      if (err?.code === 'VALIDATION_FAILED' && field) setErrors({ [field]: field });
      setFormError(t(`errors.${err?.code ?? 'UNKNOWN'}`));
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
            {id ? t('vendorOffers.deal.editTitle') : t('vendorOffers.deal.newTitle')}
          </Text>
          <Text color="grey700">{t('vendorOffers.deal.help')}</Text>
          {liveNow ? <Text weight={600}>{`● ${t('vendorOffers.deal.liveNow')}`}</Text> : null}

          {loaded ? (
            <>
              <PhotoSlots
                photos={photos}
                onChange={setPhotos}
                max={1}
                error={fieldError(t, errors.photos)}
              />
              <Input
                label={t('vendorOffers.deal.name')}
                error={fieldError(t, errors.title)}
                value={form.title}
                onChangeText={(v) => set({ title: v })}
                maxLength={120}
              />
              <Input
                label={t('vendorOffers.fields.titleNe')}
                hint={t('vendorOnboarding.optional')}
                value={form.title_ne}
                onChangeText={(v) => set({ title_ne: v })}
                maxLength={120}
              />
              <Input
                label={t('vendorOffers.deal.description')}
                hint={t('vendorOnboarding.optional')}
                value={form.description}
                onChangeText={(v) => set({ description: v })}
                multiline
                maxLength={1000}
              />

              <View style={styles.chips}>
                <Chip
                  label={t('vendorOffers.deal.modePercent')}
                  selected={form.mode === 'percent'}
                  onPress={() => set({ mode: 'percent' })}
                />
                <Chip
                  label={t('vendorOffers.deal.modePrice')}
                  selected={form.mode === 'price'}
                  onPress={() => set({ mode: 'price' })}
                />
              </View>
              {form.mode === 'percent' ? (
                <Input
                  label={t('vendorOffers.deal.percent')}
                  error={fieldError(t, errors.discount)}
                  value={form.discount_pct}
                  onChangeText={(v) => set({ discount_pct: v })}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              ) : (
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Input
                      label={t('vendorOffers.fields.originalPrice')}
                      error={fieldError(t, errors.original_price)}
                      value={form.original_price}
                      onChangeText={(v) => set({ original_price: v })}
                      keyboardType="decimal-pad"
                      maxLength={9}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Input
                      label={t('vendorOffers.deal.dealPrice')}
                      error={fieldError(t, errors.price)}
                      value={form.price}
                      onChangeText={(v) => set({ price: v })}
                      keyboardType="decimal-pad"
                      maxLength={9}
                    />
                  </View>
                </View>
              )}

              <Text variant="caption" weight={600}>
                {t('vendorOffers.deal.days')}
              </Text>
              <View style={styles.chips}>
                {DAYS.map((d) => (
                  <Chip
                    key={d}
                    label={t(`business.days.${d}`)}
                    selected={form.days.includes(d)}
                    onPress={() => toggleDay(d)}
                  />
                ))}
              </View>

              <Text variant="caption" weight={600}>
                {t('vendorOffers.deal.windows')}
              </Text>
              <Text variant="caption" color="grey700">
                {t('vendorOffers.deal.windowsHelp')}
              </Text>
              {form.times.map((w, i) => (
                <View key={i} style={styles.row}>
                  <View style={styles.flex}>
                    <Input
                      label={t('business.opens')}
                      value={w.start}
                      onChangeText={(v) => setTime(i, { start: v })}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Input
                      label={t('business.closes')}
                      value={w.end}
                      onChangeText={(v) => setTime(i, { end: v })}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                  {form.times.length > 1 ? (
                    <Button
                      variant="ghost"
                      label="✕"
                      onPress={() => set({ times: form.times.filter((_, j) => j !== i) })}
                    />
                  ) : null}
                </View>
              ))}
              {errors.windows ? <Text>{`⚠ ${fieldError(t, errors.windows)}`}</Text> : null}
              {form.times.length < 3 ? (
                <Button
                  variant="secondary"
                  label={t('vendorOffers.deal.addWindow')}
                  onPress={() => set({ times: [...form.times, { start: '21:00', end: '23:00' }] })}
                />
              ) : null}

              <View style={styles.chips}>
                <Chip
                  label={t('vendorOffers.deal.active')}
                  selected={!paused}
                  onPress={() => setPaused(false)}
                />
                <Chip
                  label={t('vendorOffers.actions.pause')}
                  selected={paused}
                  onPress={() => setPaused(true)}
                />
              </View>

              {formError ? <Text>{`⚠ ${formError}`}</Text> : null}
              <Button
                label={t('vendorOffers.deal.save')}
                loading={busy}
                onPress={() => void save()}
              />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  flex: { flex: 1 },
  content: { padding: space.xl, gap: space.l },
  row: { flexDirection: 'row', gap: space.m, alignItems: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
});
