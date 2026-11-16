import {
  FOOD_TYPES,
  priceBoxToPaisa,
  priceRangeError,
  SORT_KEYS,
  type FoodType,
  type SortKey,
} from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Chip, EmptyState, Input, Sheet, Text, TimeField } from '../../src/components';
import { useNearbyOffers, useRadius } from '../../src/features/discover/hooks';
import { OfferList } from '../../src/features/discover/OfferList';
import { useAppSettings } from '../../src/lib/appSettings';
import { activeFilterCount, useFilterStore, type KindFilter } from '../../src/store/filters';
import { color, space } from '../../src/theme';

const KINDS: {
  kind: KindFilter;
  label: 'discover.kind.all' | 'discover.kind.surplus' | 'discover.kind.happyHour';
}[] = [
  { kind: null, label: 'discover.kind.all' },
  { kind: 'surplus', label: 'discover.kind.surplus' },
  { kind: 'happy_hour', label: 'discover.kind.happyHour' },
];

const paisaToBox = (p: number | null) => (p == null ? '' : String(Math.round(p / 100)));

/**
 * C-08 Search and filters: English and Nepali text search ("momo" / "मम"),
 * filters sheet (offer kind, food type, price range, distance, pickup time,
 * sort). Min above max shows an inline error and is not applied.
 */
export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const store = useFilterStore();
  const radiusM = useRadius();
  const radii = useAppSettings().data?.radius_options_m;
  const radiusOptions = Array.isArray(radii) ? (radii as number[]) : [2000, 3000];
  const [text, setText] = useState(store.q);
  const [open, setOpen] = useState(false);

  // Search as the user types, after a short pause.
  useEffect(() => {
    const id = setTimeout(() => {
      if (text !== useFilterStore.getState().q) store.set({ q: text });
    }, 350);
    return () => clearTimeout(id);
  }, [text]);

  // Sheet draft: applied together, so a bad price range never reaches the search.
  const [draft, setDraft] = useState({
    kind: store.kind,
    foodType: store.foodType,
    priceMin: paisaToBox(store.priceMin),
    priceMax: paisaToBox(store.priceMax),
    radius: radiusM,
    pickupAfter: store.pickupAfter,
    sort: store.sort,
  });
  const openSheet = () => {
    setDraft({
      kind: store.kind,
      foodType: store.foodType,
      priceMin: paisaToBox(store.priceMin),
      priceMax: paisaToBox(store.priceMax),
      radius: radiusM,
      pickupAfter: store.pickupAfter,
      sort: store.sort,
    });
    setOpen(true);
  };
  const min = priceBoxToPaisa(draft.priceMin);
  const max = priceBoxToPaisa(draft.priceMax);
  const priceError =
    min === null || max === null
      ? t('discover.filter.priceInvalid')
      : priceRangeError(min, max)
        ? t('discover.filter.priceConflict')
        : null;

  const apply = () => {
    if (priceError) return;
    store.set({
      kind: draft.kind,
      foodType: draft.foodType,
      priceMin: min ?? null,
      priceMax: max ?? null,
      radius: draft.radius,
      pickupAfter: draft.pickupAfter,
      sort: draft.sort,
    });
    setOpen(false);
  };

  const nearby = useNearbyOffers();
  const n = activeFilterCount(store);

  const header = (
    <View style={styles.header}>
      <View style={styles.row}>
        <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
      </View>
      <Input
        label={t('discover.searchLabel')}
        placeholder={t('discover.searchPlaceholder')}
        value={text}
        onChangeText={setText}
        autoFocus
        returnKeyType="search"
        onSubmitEditing={() => store.set({ q: text })}
        maxLength={100}
      />
      <View style={styles.row}>
        <Chip
          label={n ? t('discover.filtersCount', { count: n }) : t('discover.filters')}
          selected={n > 0}
          onPress={openSheet}
        />
        {n ? <Chip label={t('discover.clearFilters')} onPress={store.clear} /> : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <OfferList
          nearby={nearby}
          header={header}
          empty={
            <EmptyState
              title={t('discover.noResults')}
              body={store.q ? t('discover.noResultsBody', { q: store.q }) : undefined}
              actionLabel={n ? t('discover.clearFilters') : undefined}
              onAction={n ? store.clear : undefined}
            />
          }
        />
      </KeyboardAvoidingView>

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('discover.filters')}>
        <KeyboardAvoidingView behavior="padding">
          <ScrollView style={styles.sheet} keyboardShouldPersistTaps="handled">
            <View style={styles.group}>
              <Text weight={600}>{t('discover.filter.kind')}</Text>
              <View style={styles.wrap}>
                {KINDS.map((k) => (
                  <Chip
                    key={k.label}
                    label={t(k.label)}
                    selected={draft.kind === k.kind}
                    onPress={() => setDraft({ ...draft, kind: k.kind })}
                  />
                ))}
              </View>
            </View>
            <View style={styles.group}>
              <Text weight={600}>{t('discover.filter.foodType')}</Text>
              <View style={styles.wrap}>
                <Chip
                  label={t('discover.kind.all')}
                  selected={draft.foodType === null}
                  onPress={() => setDraft({ ...draft, foodType: null })}
                />
                {FOOD_TYPES.map((f: FoodType) => (
                  <Chip
                    key={f}
                    label={t(`vendorOffers.foodTypes.${f}`)}
                    selected={draft.foodType === f}
                    onPress={() => setDraft({ ...draft, foodType: f })}
                  />
                ))}
              </View>
            </View>
            <View style={styles.group}>
              <Text weight={600}>{t('discover.filter.price')}</Text>
              <View style={styles.wrap}>
                <View style={styles.flex}>
                  <Input
                    label={t('discover.filter.min')}
                    value={draft.priceMin}
                    onChangeText={(v) => setDraft({ ...draft, priceMin: v })}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <View style={styles.flex}>
                  <Input
                    label={t('discover.filter.max')}
                    value={draft.priceMax}
                    onChangeText={(v) => setDraft({ ...draft, priceMax: v })}
                    keyboardType="number-pad"
                    maxLength={6}
                    error={priceError ?? undefined}
                  />
                </View>
              </View>
            </View>
            <View style={styles.group}>
              <Text weight={600}>{t('discover.filter.distance')}</Text>
              <View style={styles.wrap}>
                {radiusOptions.map((r) => (
                  <Chip
                    key={r}
                    label={t('discover.filter.km', { km: r / 1000 })}
                    selected={draft.radius === r}
                    onPress={() => setDraft({ ...draft, radius: r })}
                  />
                ))}
              </View>
            </View>
            <TimeField
              label={t('discover.filter.pickupAfter')}
              hint={t('discover.filter.pickupHint')}
              value={draft.pickupAfter}
              onChange={(v) => setDraft({ ...draft, pickupAfter: v })}
              optional
            />
            <View style={styles.group}>
              <Text weight={600}>{t('discover.filter.sort')}</Text>
              <View style={styles.wrap}>
                {SORT_KEYS.map((s: SortKey) => (
                  <Chip
                    key={s}
                    label={t(`discover.sort.${s}`)}
                    selected={draft.sort === s}
                    onPress={() => setDraft({ ...draft, sort: s })}
                  />
                ))}
              </View>
            </View>
            <Button label={t('discover.filter.apply')} disabled={!!priceError} onPress={apply} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  flex: { flex: 1 },
  header: { gap: space.m, marginBottom: space.s },
  row: { flexDirection: 'row', gap: space.s, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  group: { gap: space.s, marginBottom: space.l },
  sheet: { maxHeight: 480 },
});
