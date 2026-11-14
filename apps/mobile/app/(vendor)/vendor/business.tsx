import {
  normaliseTime,
  panSchema,
  toAppError,
  validDayHours,
  vendorLocationSchema,
  vendorProfileSchema,
  vendorTypeSchema,
  type DayHours,
  type Locale,
} from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Card, Chip, Input, Text } from '../../../src/components';
import { useUpdateProfile } from '../../../src/features/profile/hooks';
import {
  PanTakenError,
  uploadPanDoc,
  vendorPin,
} from '../../../src/features/vendor-onboarding/api';
import {
  useMyVendor,
  useSaveHours,
  useSaveVendor,
  useVendorHours,
} from '../../../src/features/vendor-onboarding/hooks';
import { PinPicker, type Pin } from '../../../src/features/vendor-onboarding/PinPicker';
import { pickImage, uploadVendorLogo, type PickSource } from '../../../src/lib/images';
import { useLanguageStore } from '../../../src/store/language';
import { color, radius, space } from '../../../src/theme';

const TYPES = vendorTypeSchema.options;
const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

interface DayRow {
  open: boolean;
  opens: string;
  closes: string;
}

/**
 * V-21 Business profile and settings: edit details, pin and PAN (name, PAN
 * or pin edits put the vendor back in the admin queue while offers stay
 * live), opening hours, language. Payout account comes with the wallet (S6).
 */
export default function BusinessProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: vendor } = useMyVendor();
  const save = useSaveVendor();
  const hours = useVendorHours(vendor?.id);
  const saveHours = useSaveHours(vendor?.id);
  const { locale, setLocale } = useLanguageStore();
  const updateProfile = useUpdateProfile();

  const saved = useMemo(() => vendorPin(vendor), [vendor]);
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]>('restaurant');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pin, setPin] = useState<Pin | null>(null);
  const [pan, setPan] = useState('');
  const [week, setWeek] = useState<Record<number, DayRow>>({});
  const [loaded, setLoaded] = useState(false);
  const [hoursLoaded, setHoursLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!vendor || loaded) return;
    setName(vendor.name ?? '');
    setType(vendor.type ?? 'restaurant');
    setDescription(vendor.description ?? '');
    setPhone(vendor.phone ?? '');
    setEmail(vendor.email ?? '');
    setAddress(vendor.address ?? '');
    setLandmark(vendor.landmark ?? '');
    setPin(saved);
    setPan(vendor.pan_vat_no ?? '');
    setLoaded(true);
  }, [vendor, loaded, saved]);

  useEffect(() => {
    if (!hours.data || hoursLoaded) return;
    const rows: Record<number, DayRow> = {};
    for (const d of DAYS) rows[d] = { open: false, opens: '09:00', closes: '21:00' };
    for (const h of hours.data)
      rows[h.day_of_week] = { open: true, opens: h.opens, closes: h.closes };
    setWeek(rows);
    setHoursLoaded(true);
  }, [hours.data, hoursLoaded]);

  const say = (section: string, text: string) => setNotice((n) => ({ ...n, [section]: text }));
  const fail = (section: string, e: unknown) =>
    say(
      section,
      `⚠ ${e instanceof PanTakenError ? t('vendorOnboarding.documents.panTaken') : t(`errors.${toAppError(e).code}`)}`,
    );

  const run = async (section: string, work: () => Promise<unknown>, done: string) => {
    if (!vendor) return;
    setBusy(section);
    say(section, '');
    try {
      await work();
      say(section, `✓ ${done}`);
    } catch (e) {
      fail(section, e);
    } finally {
      setBusy(null);
    }
  };

  const reviewNote = (changed: boolean) =>
    vendor?.status === 'approved' && changed ? t('business.savedReview') : t('business.saved');

  const saveDetails = () => {
    const parsed = vendorProfileSchema.safeParse({ name, type, description, phone, email });
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]?.path[0] ?? 'name');
      say(
        'details',
        `⚠ ${t(`vendorOnboarding.fieldError.${field}` as 'vendorOnboarding.fieldError.name')}`,
      );
      return;
    }
    const p = parsed.data;
    void run(
      'details',
      () =>
        save.mutateAsync({
          id: vendor!.id,
          patch: {
            name: p.name,
            type: p.type,
            description: p.description || null,
            phone: p.phone,
            email: p.email || null,
          },
        }),
      reviewNote(p.name !== vendor?.name),
    );
  };

  const changeLogo = async (source: PickSource) => {
    if (!vendor) return;
    const uri = await pickImage(source);
    if (!uri) return;
    void run(
      'details',
      async () => {
        const url = await uploadVendorLogo(vendor.id, uri);
        await save.mutateAsync({ id: vendor.id, patch: { logo_url: url } });
      },
      t('business.saved'),
    );
  };

  const saveLocation = () => {
    const parsed = vendorLocationSchema.safeParse({
      address,
      landmark,
      lat: pin?.lat,
      lng: pin?.lng,
    });
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]?.path[0] ?? '');
      say(
        'location',
        `⚠ ${field === 'address' ? t('vendorOnboarding.fieldError.address') : t('vendorOnboarding.location.pinRequired')}`,
      );
      return;
    }
    const p = parsed.data;
    const moved = !saved || saved.lat !== p.lat || saved.lng !== p.lng;
    void run(
      'location',
      () =>
        save.mutateAsync({
          id: vendor!.id,
          patch: { address: p.address, landmark: p.landmark || null, lat: p.lat, lng: p.lng },
        }),
      reviewNote(moved),
    );
  };

  const savePan = () => {
    const parsed = panSchema.safeParse(pan);
    if (!parsed.success) {
      say('pan', `⚠ ${t('vendorOnboarding.documents.panRules')}`);
      return;
    }
    void run(
      'pan',
      () => save.mutateAsync({ id: vendor!.id, patch: { pan_vat_no: parsed.data } }),
      reviewNote(parsed.data !== vendor?.pan_vat_no),
    );
  };

  const changePanPhoto = async (source: PickSource) => {
    if (!vendor) return;
    const uri = await pickImage(source);
    if (!uri) return;
    void run(
      'pan',
      async () => {
        // A new file name each time, so the change puts the vendor back in review.
        const path = await uploadPanDoc(vendor.id, uri);
        await save.mutateAsync({ id: vendor.id, patch: { pan_doc_path: path } });
      },
      reviewNote(true),
    );
  };

  const setDay = (d: number, patch: Partial<DayRow>) =>
    setWeek((w) => ({
      ...w,
      [d]: { ...(w[d] ?? { open: false, opens: '09:00', closes: '21:00' }), ...patch },
    }));

  const saveWeek = () => {
    const out: DayHours[] = [];
    for (const d of DAYS) {
      const row = week[d];
      if (!row?.open) continue;
      const h = {
        day_of_week: d,
        opens: normaliseTime(row.opens) ?? '',
        closes: normaliseTime(row.closes) ?? '',
      };
      if (!validDayHours(h)) {
        say('hours', `⚠ ${t('business.hoursInvalid', { day: t(`business.days.${d}`) })}`);
        return;
      }
      out.push(h);
    }
    void run('hours', () => saveHours.mutateAsync(out), t('business.saved'));
  };

  const chooseLanguage = (next: Locale) => {
    setLocale(next);
    updateProfile.mutate({ locale: next });
  };

  const Notice = ({ section }: { section: string }) =>
    notice[section] ? <Text>{notice[section]}</Text> : null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
          <Text variant="title" accessibilityRole="header">
            {t('business.title')}
          </Text>
          {vendor?.pending_review ? (
            <Card>
              <Text weight={600}>{`⚠ ${t('vendorHome.underReview')}`}</Text>
              <Text color="grey700">{t('vendorHome.underReviewBody')}</Text>
            </Card>
          ) : null}
          <Text color="grey700">{t('business.reviewRule')}</Text>

          {/* Details ------------------------------------------------------ */}
          <Text variant="button">{t('business.details')}</Text>
          <View style={styles.logoRow}>
            {vendor?.logo_url ? (
              <Image
                source={{ uri: vendor.logo_url }}
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
                disabled={!!busy}
                onPress={() => void changeLogo('library')}
              />
              <Button
                variant="ghost"
                label={t('vendorOnboarding.photo.camera')}
                disabled={!!busy}
                onPress={() => void changeLogo('camera')}
              />
            </View>
          </View>
          <Input
            label={t('vendorOnboarding.profile.name')}
            hint={t('business.needsReview')}
            value={name}
            onChangeText={setName}
            maxLength={120}
          />
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
          <Input
            label={t('vendorOnboarding.profile.description')}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={2000}
          />
          <Input
            label={t('vendorOnboarding.profile.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={16}
          />
          <Input
            label={t('vendorOnboarding.profile.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Notice section="details" />
          <Button
            label={t('business.saveDetails')}
            loading={busy === 'details'}
            disabled={!vendor}
            onPress={saveDetails}
          />

          {/* Location ----------------------------------------------------- */}
          <Text variant="button">{t('business.location')}</Text>
          {loaded ? <PinPicker initial={saved} pin={pin} onChange={setPin} /> : null}
          <Input
            label={t('vendorOnboarding.location.address')}
            value={address}
            onChangeText={setAddress}
            maxLength={200}
          />
          <Input
            label={t('vendorOnboarding.location.landmark')}
            value={landmark}
            onChangeText={setLandmark}
            maxLength={200}
          />
          <Notice section="location" />
          <Button
            label={t('business.saveLocation')}
            loading={busy === 'location'}
            disabled={!vendor}
            onPress={saveLocation}
          />

          {/* PAN ---------------------------------------------------------- */}
          <Text variant="button">{t('vendorOnboarding.documents.pan')}</Text>
          <Input
            label={t('vendorOnboarding.documents.pan')}
            hint={t('business.needsReview')}
            value={pan}
            onChangeText={setPan}
            keyboardType="number-pad"
            maxLength={11}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                variant="secondary"
                label={t('business.newPanPhoto')}
                disabled={!!busy}
                onPress={() => void changePanPhoto('camera')}
              />
            </View>
            <View style={styles.flex}>
              <Button
                variant="secondary"
                label={t('vendorOnboarding.photo.library')}
                disabled={!!busy}
                onPress={() => void changePanPhoto('library')}
              />
            </View>
          </View>
          <Notice section="pan" />
          <Button
            label={t('business.savePan')}
            loading={busy === 'pan'}
            disabled={!vendor}
            onPress={savePan}
          />

          {/* Opening hours ------------------------------------------------ */}
          <Text variant="button">{t('business.hours')}</Text>
          <Text variant="caption" color="grey700">
            {t('business.hoursHelp')}
          </Text>
          {DAYS.map((d) => {
            const row = week[d];
            return (
              <View key={d} style={styles.dayRow}>
                <View style={styles.dayName}>
                  <Chip
                    label={t(`business.days.${d}`)}
                    selected={!!row?.open}
                    onPress={() => setDay(d, { open: !row?.open })}
                  />
                </View>
                {row?.open ? (
                  <>
                    <View style={styles.flex}>
                      <Input
                        label={t('business.opens')}
                        value={row.opens}
                        onChangeText={(v) => setDay(d, { opens: v })}
                        maxLength={5}
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                    <View style={styles.flex}>
                      <Input
                        label={t('business.closes')}
                        value={row.closes}
                        onChangeText={(v) => setDay(d, { closes: v })}
                        maxLength={5}
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                  </>
                ) : (
                  <Text color="grey700" style={styles.flex}>
                    {t('business.closed')}
                  </Text>
                )}
              </View>
            );
          })}
          <Notice section="hours" />
          <Button
            label={t('business.saveHours')}
            loading={busy === 'hours'}
            disabled={!vendor || !hoursLoaded}
            onPress={saveWeek}
          />

          {/* Language ----------------------------------------------------- */}
          <Text variant="button">{t('settings.language')}</Text>
          <View style={styles.chips}>
            <Chip label="English" selected={locale === 'en'} onPress={() => chooseLanguage('en')} />
            <Chip label="नेपाली" selected={locale === 'ne'} onPress={() => chooseLanguage('ne')} />
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: space.l },
  logo: { width: 72, height: 72, borderRadius: radius.box },
  logoEmpty: { borderWidth: 1, borderColor: color.grey300, backgroundColor: color.grey100 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  dayName: { width: 96 },
});
