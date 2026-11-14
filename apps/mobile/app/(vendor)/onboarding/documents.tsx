import { missingVendorFields, panSchema, toAppError } from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Input, Text } from '../../../src/components';
import {
  PanTakenError,
  uploadPanDoc,
  vendorPin,
} from '../../../src/features/vendor-onboarding/api';
import {
  useMyVendor,
  useSaveVendor,
  useSubmitApplication,
} from '../../../src/features/vendor-onboarding/hooks';
import { StepHeader } from '../../../src/features/vendor-onboarding/StepHeader';
import { pickImage, type PickSource } from '../../../src/lib/images';
import { color, space } from '../../../src/theme';

/**
 * V-04 Upload documents (3 of 3): PAN / VAT number + photo to the private
 * bucket; Submit moves the draft (or a rejected application) to submitted.
 */
export default function VendorDocumentsStep() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: vendor } = useMyVendor();
  const save = useSaveVendor();
  const submit = useSubmitApplication();

  const [pan, setPan] = useState('');
  const [panError, setPanError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!vendor || loaded) return;
    setPan(vendor.pan_vat_no ?? '');
    setLoaded(true);
  }, [vendor, loaded]);

  const showError = (e: unknown) => {
    if (e instanceof PanTakenError) setPanError(t('vendorOnboarding.documents.panTaken'));
    else setFormError(t(`errors.${toAppError(e).code}`));
  };

  const addPhoto = async (source: PickSource) => {
    if (!vendor) return;
    setFormError(null);
    const uri = await pickImage(source);
    if (!uri) return;
    setPhotoBusy(true);
    try {
      const path = await uploadPanDoc(vendor.id, uri);
      await save.mutateAsync({ id: vendor.id, patch: { pan_doc_path: path } });
    } catch (e) {
      showError(e);
    } finally {
      setPhotoBusy(false);
    }
  };

  const onSubmit = async () => {
    if (!vendor) return;
    setPanError(null);
    setFormError(null);
    const parsed = panSchema.safeParse(pan);
    if (!parsed.success) {
      setPanError(t('vendorOnboarding.documents.panRules'));
      return;
    }
    try {
      const saved = await save.mutateAsync({ id: vendor.id, patch: { pan_vat_no: parsed.data } });
      const missing = missingVendorFields({ ...saved, location: vendorPin(saved) });
      if (missing.length > 0) {
        setFormError(
          t('vendorOnboarding.documents.missing', {
            fields: missing.map((f) => t(`vendorOnboarding.fields.${f}`)).join(', '),
          }),
        );
        return;
      }
      await submit.mutateAsync();
      router.replace('/onboarding/status');
    } catch (e) {
      showError(e);
    }
  };

  const busy = save.isPending || submit.isPending;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <StepHeader step={3} title={t('vendorOnboarding.documents.title')} />
          <Text color="grey700">{t('vendorOnboarding.documents.help')}</Text>

          <Input
            label={t('vendorOnboarding.documents.pan')}
            hint={t('vendorOnboarding.documents.panHint')}
            error={panError ?? undefined}
            value={pan}
            onChangeText={setPan}
            keyboardType="number-pad"
            maxLength={11}
          />

          <Text variant="caption" weight={600}>
            {t('vendorOnboarding.documents.photo')}
          </Text>
          <Text color="grey700">
            {vendor?.pan_doc_path
              ? `✓ ${t('vendorOnboarding.documents.photoDone')}`
              : t('vendorOnboarding.documents.photoNone')}
          </Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                variant="secondary"
                label={t('vendorOnboarding.photo.camera')}
                loading={photoBusy}
                onPress={() => void addPhoto('camera')}
              />
            </View>
            <View style={styles.flex}>
              <Button
                variant="secondary"
                label={t('vendorOnboarding.photo.library')}
                disabled={photoBusy}
                onPress={() => void addPhoto('library')}
              />
            </View>
          </View>
          <Text variant="caption" color="grey700">
            {t('vendorOnboarding.documents.private')}
          </Text>

          {formError ? <Text>{`⚠ ${formError}`}</Text> : null}
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button variant="secondary" label={t('common.back')} onPress={() => router.back()} />
            </View>
            <View style={styles.flex}>
              <Button
                label={t('vendorOnboarding.documents.submit')}
                loading={busy && !photoBusy}
                disabled={!vendor || photoBusy}
                onPress={() => void onSubmit()}
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
