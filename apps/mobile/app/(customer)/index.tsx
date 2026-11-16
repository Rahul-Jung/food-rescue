import { Link, Redirect, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Chip, EmptyState, Text } from '../../src/components';
import { AreaSheet } from '../../src/features/discover/AreaSheet';
import {
  useNearbyOffers,
  useOutsidePilot,
  useRadius,
  useSearchPoint,
} from '../../src/features/discover/hooks';
import { NearbyOfferCard } from '../../src/features/discover/NearbyOfferCard';
import { OfferList } from '../../src/features/discover/OfferList';
import { areaPoint, locate } from '../../src/lib/location';
import { activeFilterCount, chipOn, useFilterStore, type QuickChip } from '../../src/store/filters';
import { useLanguageStore } from '../../src/store/language';
import { useLocationStore } from '../../src/store/location';
import { useOnboardingStore, type PilotArea } from '../../src/store/onboarding';
import { color, radius, space, touch } from '../../src/theme';

const CHIPS: QuickChip[] = ['happyHour', 'veg', 'bakery', 'under200'];

/**
 * C-06 Home (nearby list): area selector, search bar, quick chips, featured
 * strip, 20 per page with infinite scroll and pull to refresh; cached for
 * offline. C-29 empty state suggests 3 km and shows happy hour deals if any.
 */
export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useLanguageStore((s) => s.locale);
  const point = useSearchPoint();
  const setPoint = useLocationStore((s) => s.setPoint);
  const setArea = useOnboardingStore((s) => s.setArea);
  const outside = useOutsidePilot(point);
  const filters = useFilterStore();
  const radiusM = useRadius();
  const [picking, setPicking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [noFix, setNoFix] = useState(false);

  // A GPS point lives in memory only (N7): after a restart, locate again.
  useEffect(() => {
    if (point) return;
    setLocating(true);
    void locate().then((r) => {
      setLocating(false);
      if (r.ok) setPoint(r.point);
      else setNoFix(true);
    });
  }, []);

  const nearby = useNearbyOffers();
  const empty = !nearby.isPending && nearby.offers.length === 0;
  // C-29: happy hour deals within 3 km, only when the list is empty.
  const deals = useNearbyOffers(
    {
      kind: 'happy_hour',
      foodType: null,
      vendorType: null,
      priceMin: null,
      priceMax: null,
      radius: 3000,
    },
    { enabled: empty },
  );

  if (outside) return <Redirect href={'/waitlist' as Href} />;

  const pickArea = (a: PilotArea) => {
    setArea(a);
    setPoint(areaPoint(a));
    setPicking(false);
  };
  const nearMe = async () => {
    setPicking(false);
    setLocating(true);
    const r = await locate();
    setLocating(false);
    if (r.ok) {
      setPoint(r.point);
      setNoFix(false);
    } else setNoFix(true);
  };

  const areaLabel = !point
    ? t('discover.chooseArea')
    : point.source === 'gps'
      ? t('discover.nearMe')
      : (() => {
          const a = useOnboardingStore.getState().area;
          return locale === 'ne' && a?.name_ne ? a.name_ne : (point.areaName ?? '');
        })();

  const featured = nearby.offers.filter((o) => o.is_featured);
  const nFilters = activeFilterCount(filters);

  const header = (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('discover.chooseArea')}
          onPress={() => setPicking(true)}
          style={styles.area}
        >
          <Text variant="caption" color="grey500">
            {t('discover.showingNear')}
          </Text>
          <Text variant="button" numberOfLines={1}>{`${areaLabel} ▾`}</Text>
        </Pressable>
        <Link href={'/map' as Href} asChild>
          <Pressable accessibilityRole="button" style={styles.iconBtn}>
            <Text variant="button">{t('discover.map')}</Text>
          </Pressable>
        </Link>
        <Link href={'/profile' as Href} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.profile')}
            style={styles.iconBtn}
          >
            <Text variant="button">☺</Text>
          </Pressable>
        </Link>
      </View>

      <Pressable
        accessibilityRole="search"
        onPress={() => router.push('/search' as Href)}
        style={styles.search}
      >
        <Text color="grey500">{`⌕ ${filters.q || t('discover.searchPlaceholder')}`}</Text>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {CHIPS.map((c) => (
          <Chip
            key={c}
            label={t(`discover.chips.${c}`)}
            selected={chipOn(filters, c)}
            onPress={() => filters.toggle(c)}
          />
        ))}
        <Chip
          label={nFilters ? t('discover.filtersCount', { count: nFilters }) : t('discover.filters')}
          selected={nFilters > 0}
          onPress={() => router.push('/search' as Href)}
        />
      </ScrollView>

      {featured.length ? (
        <View style={styles.featured}>
          <Text weight={600}>{t('discover.featured')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {featured.map((o) => (
              <View key={o.id} style={styles.featuredCard}>
                <NearbyOfferCard offer={o} />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );

  const emptyState = (
    <View style={styles.empty}>
      <EmptyState
        title={t('discover.empty.title')}
        body={radiusM < 3000 ? t('discover.empty.bodyRadius') : t('discover.empty.body')}
        actionLabel={radiusM < 3000 ? t('discover.empty.try3km') : undefined}
        onAction={radiusM < 3000 ? () => filters.set({ radius: 3000 }) : undefined}
      />
      {nFilters > 0 ? (
        <Button variant="ghost" label={t('discover.clearFilters')} onPress={filters.clear} />
      ) : null}
      {deals.offers.length && filters.kind !== 'happy_hour' ? (
        <View style={styles.dealList}>
          <Text weight={600}>{t('discover.empty.deals')}</Text>
          {deals.offers.slice(0, 5).map((o) => (
            <NearbyOfferCard key={o.id} offer={o} />
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {!point ? (
        <View style={styles.noPoint}>
          {locating ? (
            <Text color="grey700">{t('discover.locating')}</Text>
          ) : (
            <EmptyState
              title={noFix ? t('discover.noFix') : t('discover.chooseArea')}
              actionLabel={t('discover.chooseArea')}
              onAction={() => setPicking(true)}
            />
          )}
        </View>
      ) : (
        <OfferList nearby={nearby} header={header} empty={emptyState} />
      )}
      <AreaSheet
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={pickArea}
        onNearMe={() => void nearMe()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  header: { gap: space.m, marginBottom: space.s },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  area: { flex: 1, minHeight: touch, justifyContent: 'center' },
  iconBtn: {
    minWidth: touch,
    minHeight: touch,
    paddingHorizontal: space.m,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.grey300,
    borderRadius: radius.box,
  },
  search: {
    minHeight: touch,
    justifyContent: 'center',
    paddingHorizontal: space.l,
    borderWidth: 1,
    borderColor: color.grey300,
    borderRadius: radius.box,
  },
  chips: { gap: space.s },
  featured: { gap: space.s },
  featuredCard: { width: 260 },
  empty: { gap: space.l },
  dealList: { gap: space.m },
  noPoint: { flex: 1, justifyContent: 'center', padding: space.xl },
});
