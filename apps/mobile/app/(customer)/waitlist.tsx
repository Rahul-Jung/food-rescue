import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, FormScrollView, Input, Text } from '../../src/components';
import { AreaSheet } from '../../src/features/discover/AreaSheet';
import { joinWaitlist } from '../../src/features/discover/api';
import { useSearchPoint } from '../../src/features/discover/hooks';
import { OfferError } from '../../src/features/offers/api';
import { areaPoint } from '../../src/lib/location';
import { useLocationStore } from '../../src/store/location';
import { useOnboardingStore, type PilotArea } from '../../src/store/onboarding';
import { color, space } from '../../src/theme';

const CONTACT = /^(\+?[0-9]{7,15}|[^@\s]+@[^@\s]+\.[^@\s]+)$/;

/** T5.3 waitlist: the point is outside the pilot polygon. Saves phone or email + area. */
export default function WaitlistScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const point = useSearchPoint();
  const setPoint = useLocationStore((s) => s.setPoint);
  const setArea = useOnboardingStore((s) => s.setArea);
  const [contact, setContact] = useState('');
  const [area, setAreaText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [picking, setPicking] = useState(false);

  const submit = async () => {
    setError(null);
    const c = contact.replace(/\s/g, '');
    if (!CONTACT.test(c)) {
      setError(t('waitlist.contactInvalid'));
      return;
    }
    setBusy(true);
    try {
      await joinWaitlist(c, area.trim() || null, point ? { lat: point.lat, lng: point.lng } : null);
      setSaved(true);
    } catch (e) {
      setError(t(`errors.${e instanceof OfferError ? e.code : 'UNKNOWN'}`));
    } finally {
      setBusy(false);
    }
  };

  const pick = (a: PilotArea) => {
    setArea(a);
    setPoint(areaPoint(a));
    setPicking(false);
    router.replace('/' as Href);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FormScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="title" accessibilityRole="header">
            {t('waitlist.title')}
          </Text>
          <Text color="grey700">{t('waitlist.body')}</Text>
          {saved ? (
            <Text weight={600} accessibilityLiveRegion="polite">{`✓ ${t('waitlist.saved')}`}</Text>
          ) : (
            <>
              <Input
                label={t('waitlist.contact')}
                hint={t('waitlist.contactHint')}
                error={error ?? undefined}
                value={contact}
                onChangeText={setContact}
                autoCapitalize="none"
                keyboardType="email-address"
                maxLength={254}
              />
              <Input
                label={t('waitlist.area')}
                hint={t('vendorOnboarding.optional')}
                value={area}
                onChangeText={setAreaText}
                maxLength={120}
              />
              <Button label={t('waitlist.join')} loading={busy} onPress={() => void submit()} />
            </>
          )}
          <Button
            variant="secondary"
            label={t('waitlist.pickArea')}
            onPress={() => setPicking(true)}
          />
        </FormScrollView>
      </KeyboardAvoidingView>
      <AreaSheet visible={picking} onClose={() => setPicking(false)} onPick={pick} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  flex: { flex: 1 },
  content: { padding: space.xl, gap: space.l },
});
