import * as Location from 'expo-location';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, ListRow, Text } from '../../src/components';
import { useAppSettings } from '../../src/lib/appSettings';
import { useLanguageStore } from '../../src/store/language';
import { useLocationStore } from '../../src/store/location';
import { useOnboardingStore, type PilotArea } from '../../src/store/onboarding';
import { color, space } from '../../src/theme';

function pilotAreas(value: unknown): PilotArea[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is PilotArea =>
      typeof a?.name === 'string' && typeof a?.lat === 'number' && typeof a?.lng === 'number',
  );
}

/** C-05 Allow location: foreground only, used per search, never stored; denied = pick an area. */
export default function LocationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useLanguageStore((s) => s.locale);
  const { setArea, setLocationDone } = useOnboardingStore();
  const setPoint = useLocationStore((s) => s.setPoint);
  const areas = pilotAreas(useAppSettings().data?.pilot_areas);
  const [showAreas, setShowAreas] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  const done = () => {
    setLocationDone();
    router.replace('/' as Href); // customer home (/(customer)/index)
  };

  const useMyLocation = async () => {
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDenied(true);
        setShowAreas(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps' });
      done();
    } catch {
      setDenied(true);
      setShowAreas(true);
    } finally {
      setBusy(false);
    }
  };

  const pick = (area: PilotArea) => {
    setArea(area);
    setPoint({ lat: area.lat, lng: area.lng, source: 'area', areaName: area.name });
    done();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title">{t('auth.location.title')}</Text>
        <Text color="grey700">{t('auth.location.body')}</Text>

        {!showAreas ? (
          <View style={styles.buttons}>
            <Button
              label={t('auth.location.useLocation')}
              loading={busy}
              onPress={() => void useMyLocation()}
            />
            <Button
              variant="secondary"
              label={t('auth.location.pickArea')}
              onPress={() => setShowAreas(true)}
            />
          </View>
        ) : (
          <View style={styles.list}>
            {denied ? <Text weight={600}>{`⚠ ${t('auth.location.denied')}`}</Text> : null}
            <Text variant="caption" color="grey700">
              {t('auth.location.areasTitle')}
            </Text>
            {areas.length ? (
              areas.map((a) => (
                <ListRow
                  key={a.name}
                  title={locale === 'ne' && a.name_ne ? a.name_ne : a.name}
                  onPress={() => pick(a)}
                />
              ))
            ) : (
              <EmptyState title={t('auth.location.noAreas')} />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  content: { padding: space.xl, gap: space.l },
  buttons: { gap: space.m },
  list: { gap: space.s },
});
