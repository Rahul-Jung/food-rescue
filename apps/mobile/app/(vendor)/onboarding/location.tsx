import { toAppError, vendorLocationSchema } from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Input, Text } from '../../../src/components';
import { vendorPin } from '../../../src/features/vendor-onboarding/api';
import { useMyVendor, useSaveVendor } from '../../../src/features/vendor-onboarding/hooks';
import { PinPicker, type Pin } from '../../../src/features/vendor-onboarding/PinPicker';
import { nextStep } from '../../../src/features/vendor-onboarding/route';
import { StepHeader } from '../../../src/features/vendor-onboarding/StepHeader';
import { color, space } from '../../../src/theme';

/**
 * V-03 Map pin and address (2 of 3): drag the map to place the pin
 * (required), address + landmark, warning when outside the pilot area.
 */
export default function VendorLocationStep() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: vendor } = useMyVendor();
  const save = useSaveVendor();

  const saved = useMemo(() => vendorPin(vendor), [vendor]);
  const [pin, setPin] = useState<Pin | null>(null);
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Coming back mid-way: the saved draft fills the form and the map.
  useEffect(() => {
    if (!vendor || loaded) return;
    setAddress(vendor.address ?? '');
    setLandmark(vendor.landmark ?? '');
    setPin(saved);
    setLoaded(true);
  }, [vendor, loaded, saved]);

  const next = () => {
    if (!vendor) return;
    setFormError(null);
    const parsed = vendorLocationSchema.safeParse({
      address,
      landmark,
      lat: pin?.lat,
      lng: pin?.lng,
    });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? '');
        if (field === 'lat' || field === 'lng') e.pin = t('vendorOnboarding.location.pinRequired');
        else if (field === 'address') e.address = t('vendorOnboarding.fieldError.address');
      }
      setErrors(e);
      return;
    }
    setErrors({});
    const p = parsed.data;
    save.mutate(
      {
        id: vendor.id,
        patch: { address: p.address, landmark: p.landmark || null, lat: p.lat, lng: p.lng },
      },
      {
        onSuccess: () => router.push(nextStep('onboarding/location') as '/onboarding/documents'),
        onError: (e) => setFormError(t(`errors.${toAppError(e).code}`)),
      },
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <StepHeader step={2} title={t('vendorOnboarding.location.title')} />
          <Text color="grey700">{t('vendorOnboarding.location.help')}</Text>

          {loaded ? (
            <PinPicker initial={saved} pin={pin} onChange={setPin} error={errors.pin} />
          ) : null}

          <Input
            label={t('vendorOnboarding.location.address')}
            error={errors.address}
            value={address}
            onChangeText={setAddress}
            maxLength={200}
          />
          <Input
            label={t('vendorOnboarding.location.landmark')}
            hint={t('vendorOnboarding.location.landmarkHint')}
            value={landmark}
            onChangeText={setLandmark}
            maxLength={200}
          />

          {formError ? <Text>{`⚠ ${formError}`}</Text> : null}
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button variant="secondary" label={t('common.back')} onPress={() => router.back()} />
            </View>
            <View style={styles.flex}>
              <Button
                label={t('vendorOnboarding.saveContinue')}
                loading={save.isPending}
                disabled={!vendor}
                onPress={next}
              />
            </View>
          </View>
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
