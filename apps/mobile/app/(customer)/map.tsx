import { clusterPoints, toDigits } from '@food-rescue/shared';
import { useRouter, type Href } from 'expo-router';
import { memo, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Chip, EmptyState, Text } from '../../src/components';
import type { NearbyOffer } from '../../src/features/discover/api';
import { useNearbyOffers, useRadius, useSearchPoint } from '../../src/features/discover/hooks';
import { NearbyOfferCard } from '../../src/features/discover/NearbyOfferCard';
import { env } from '../../src/lib/env';
import { useOfferQuantity } from '../../src/lib/realtime';
import { useFilterStore, type KindFilter } from '../../src/store/filters';
import { useLanguageStore } from '../../src/store/language';
import { color, radius, space, touch } from '../../src/theme';

const KINDS: {
  kind: KindFilter;
  label: 'discover.kind.all' | 'discover.kind.surplus' | 'discover.kind.happyHour';
}[] = [
  { kind: null, label: 'discover.kind.all' },
  { kind: 'surplus', label: 'discover.kind.surplus' },
  { kind: 'happy_hour', label: 'discover.kind.happyHour' },
];

/** Span that shows the whole search radius around the point. */
function regionFor(lat: number, lng: number, radiusM: number): Region {
  const d = (radiusM * 2.4) / 111_000;
  return { latitude: lat, longitude: lng, latitudeDelta: d, longitudeDelta: d };
}

/** One pin: the discount in a black box, or a count for a cluster. Memo keeps 150 pins smooth. */
const Pin = memo(function Pin({ label, selected }: { label: string; selected: boolean }) {
  return (
    <View style={[styles.pin, selected && styles.pinSelected]}>
      <Text variant="caption" weight={600} color={selected ? 'ink' : 'paper'}>
        {label}
      </Text>
    </View>
  );
});

/**
 * C-07 Map: react-native-maps, pins showing the discount, clustered when
 * zoomed out, a bottom card for the tapped offer (live quantity, T5.7), and
 * All / Surplus / Happy hour chips. Uses the same filters as the list.
 */
export default function MapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const digits = useLanguageStore((s) => s.digits);
  const point = useSearchPoint();
  const radiusM = useRadius();
  const kind = useFilterStore((s) => s.kind);
  const setFilters = useFilterStore((s) => s.set);
  const nearby = useNearbyOffers({}, { allPages: true });
  const map = useRef<MapView>(null);
  const initial = point ? regionFor(point.lat, point.lng, radiusM) : null;
  const [span, setSpan] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const clusters = useMemo(
    () => (span ? clusterPoints(nearby.offers, span) : []),
    [nearby.offers, span],
  );
  const selected = nearby.offers.find((o) => o.id === selectedId) ?? null;
  const live = useOfferQuantity(
    selected?.offer_kind === 'surplus' ? selected.id : null,
    selected?.quantity_left ?? null,
  );

  // Android Google Maps needs EXPO_PUBLIC_GOOGLE_MAPS_KEY in the build (still missing, parked).
  const mapAvailable = Platform.OS !== 'android' || env.googleMapsKey !== '';

  const pinLabel = (o: NearbyOffer) =>
    o.discount_pct ? `-${toDigits(String(o.discount_pct), digits)}%` : '•';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
        <View style={styles.chips}>
          {KINDS.map((k) => (
            <Chip
              key={k.label}
              label={t(k.label)}
              selected={kind === k.kind}
              onPress={() => {
                setSelectedId(null);
                setFilters({ kind: k.kind });
              }}
            />
          ))}
        </View>
      </View>

      {!point || !initial ? (
        <EmptyState
          title={t('discover.chooseArea')}
          actionLabel={t('discover.list')}
          onAction={() => router.replace('/' as Href)}
        />
      ) : !mapAvailable ? (
        <EmptyState
          title={t('discover.noMap')}
          actionLabel={t('discover.list')}
          onAction={() => router.replace('/' as Href)}
        />
      ) : (
        <View style={styles.flex}>
          <MapView
            ref={map}
            style={styles.flex}
            initialRegion={initial}
            onRegionChangeComplete={(r) => setSpan(r)}
            onPress={() => setSelectedId(null)}
            showsUserLocation={point.source === 'gps'}
            toolbarEnabled={false}
            accessibilityLabel={t('discover.mapLabel')}
          >
            <Circle
              center={{ latitude: point.lat, longitude: point.lng }}
              radius={radiusM}
              strokeColor={color.grey500}
              fillColor="rgba(0,0,0,0.04)"
            />
            {clusters.map((c) => {
              const single = c.items.length === 1 ? c.items[0] : null;
              const isSelected = !!single && single.id === selectedId;
              return (
                <Marker
                  // remount on select so the pin redraws with tracksViewChanges off
                  key={isSelected ? `${c.key}:sel` : c.key}
                  coordinate={{ latitude: c.lat, longitude: c.lng }}
                  tracksViewChanges={false}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (single) {
                      setSelectedId(single.id);
                    } else if (span) {
                      map.current?.animateToRegion(
                        {
                          latitude: c.lat,
                          longitude: c.lng,
                          latitudeDelta: span.latitudeDelta / 3,
                          longitudeDelta: span.longitudeDelta / 3,
                        },
                        300,
                      );
                    }
                  }}
                  accessibilityLabel={
                    single ? single.title : t('discover.cluster', { count: c.items.length })
                  }
                >
                  <Pin
                    label={single ? pinLabel(single) : toDigits(String(c.items.length), digits)}
                    selected={isSelected}
                  />
                </Marker>
              );
            })}
          </MapView>

          {nearby.isFetching ? (
            <View style={styles.loading} pointerEvents="none">
              <Text variant="caption" color="paper">
                {t('common.loading')}
              </Text>
            </View>
          ) : null}

          {selected ? (
            <View style={styles.card}>
              <NearbyOfferCard
                offer={selected}
                quantityLeft={selected.offer_kind === 'surplus' ? live.quantityLeft : undefined}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                onPress={() => setSelectedId(null)}
                style={styles.close}
              >
                <Text variant="button">✕</Text>
              </Pressable>
            </View>
          ) : !nearby.isPending && nearby.offers.length === 0 ? (
            <View style={styles.card}>
              <Text>{t('discover.empty.title')}</Text>
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  flex: { flex: 1 },
  bar: { paddingHorizontal: space.l, paddingBottom: space.s, gap: space.s },
  chips: { flexDirection: 'row', gap: space.s, flexWrap: 'wrap' },
  pin: {
    minWidth: 36,
    paddingHorizontal: space.s,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    borderWidth: 2,
    borderColor: color.paper,
    alignItems: 'center',
  },
  pinSelected: { backgroundColor: color.paper, borderColor: color.ink },
  loading: {
    position: 'absolute',
    top: space.m,
    alignSelf: 'center',
    backgroundColor: color.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.m,
    paddingVertical: space.xs,
  },
  card: {
    position: 'absolute',
    left: space.l,
    right: space.l,
    bottom: space.l,
    backgroundColor: color.paper,
    borderRadius: radius.box,
    padding: space.s,
    borderWidth: 1,
    borderColor: color.grey300,
  },
  close: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: touch,
    height: touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
