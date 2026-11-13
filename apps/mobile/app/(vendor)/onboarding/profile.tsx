import { toAppError, vendorProfileSchema, vendorTypeSchema } from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Chip, Input, Text } from '../../../src/components';
import { useMyVendor, useSaveVendor } from '../../../src/features/vendor-onboarding/hooks';
import { nextStep } from '../../../src/features/vendor-onboarding/route';
import { StepHeader } from '../../../src/features/vendor-onboarding/StepHeader';
import { pickImage, uploadVendorLogo, type PickSource } from '../../../src/lib/images';
import { color, radius, space } from '../../../src/theme';

const TYPES = vendorTypeSchema.options;

/** V-02 Business profile (1 of 3): name, type, logo, description, phone, email; saved as a draft. */
export default function VendorProfileStep() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: vendor } = useMyVendor();
  const save = useSaveVendor();

  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]>('restaurant');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Coming back mid-way: the saved draft fills the form.
  useEffect(() => {
    if (!vendor || loaded) return;
    setName(vendor.name ?? '');
    setType(vendor.type ?? 'restaurant');
    setDescription(vendor.description ?? '');
    setPhone(vendor.phone ?? '');
    setEmail(vendor.email ?? '');
    setLogoUrl(vendor.logo_url);
    setLoaded(true);
  }, [vendor, loaded]);

  const addLogo = async (source: PickSource) => {
    if (!vendor) return;
    setFormError(null);
    const uri = await pickImage(source);
    if (!uri) return;
    setLogoBusy(true);
    try {
      const url = await uploadVendorLogo(vendor.id, uri);
      await save.mutateAsync({ id: vendor.id, patch: { logo_url: url } });
      setLogoUrl(url);
    } catch (e) {
      setFormError(t(`errors.${toAppError(e).code}`));
    } finally {
      setLogoBusy(false);
    }
  };

  const next = () => {
    if (!vendor) return;
    setFormError(null);
    const parsed = vendorProfileSchema.safeParse({ name, type, description, phone, email });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? '');
        if (field && !e[field])
          e[field] = t(
            `vendorOnboarding.fieldError.${field}` as 'vendorOnboarding.fieldError.name',
          );
      }
      setErrors(e);
      return;
    }
    setErrors({});
    const p = parsed.data;
    save.mutate(
      {
        id: vendor.id,
        patch: {
          name: p.name,
          type: p.type,
          description: p.description || null,
          phone: p.phone,
          email: p.email || null,
        },
      },
      {
        onSuccess: () => router.push(nextStep('onboarding/profile') as '/onboarding/location'),
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
          <StepHeader step={1} title={t('vendorOnboarding.profile.title')} />
          {vendor?.status === 'rejected' && vendor.reject_reason ? (
            <Text color="grey700">
              {t('vendorOnboarding.status.rejectedReason', { reason: vendor.reject_reason })}
            </Text>
          ) : null}

          <Input
            label={t('vendorOnboarding.profile.name')}
            error={errors.name}
            value={name}
            onChangeText={setName}
            maxLength={120}
          />

          <Text variant="caption" weight={600}>
            {t('vendorOnboarding.profile.type')}
          </Text>
          <View style={styles.chips}>
            {TYPES.map((v) => (
              <Chip
                key={v}
                label={t(`vendorOnboarding.types.${v}`)}
                selected={type === v}
                onPress={() => setType(v)}
              />
            ))}
          </View>

          <Text variant="caption" weight={600}>
            {t('vendorOnboarding.profile.logo')}
          </Text>
          <View style={styles.logoRow}>
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={styles.logo}
                accessibilityLabel={t('vendorOnboarding.profile.logo')}
              />
            ) : (
              <View style={[styles.logo, styles.logoEmpty]} />
            )}
            <View style={styles.flex}>
              <Button
                variant="secondary"
                label={t('vendorOnboarding.photo.library')}
                loading={logoBusy}
                onPress={() => void addLogo('library')}
              />
              <Button
                variant="ghost"
                label={t('vendorOnboarding.photo.camera')}
                disabled={logoBusy}
                onPress={() => void addLogo('camera')}
              />
            </View>
          </View>

          <Input
            label={t('vendorOnboarding.profile.description')}
            hint={t('vendorOnboarding.optional')}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={2000}
          />
          <Input
            label={t('vendorOnboarding.profile.phone')}
            hint={t('vendorOnboarding.profile.phoneHint')}
            error={errors.phone}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={16}
          />
          <Input
            label={t('vendorOnboarding.profile.email')}
            hint={t('vendorOnboarding.optional')}
            error={errors.email}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {formError ? <Text>{`⚠ ${formError}`}</Text> : null}
          <Button
            label={t('vendorOnboarding.saveContinue')}
            loading={save.isPending && !logoBusy}
            disabled={!vendor}
            onPress={next}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: space.l },
  logo: { width: 72, height: 72, borderRadius: radius.box },
  logoEmpty: { borderWidth: 1, borderColor: color.grey300, backgroundColor: color.grey100 },
});
