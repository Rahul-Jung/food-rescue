import { toDigits } from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Chip, Text } from '../../src/components';
import { useMyProfile, useUpdateProfile } from '../../src/features/profile/hooks';
import { useAppSettings } from '../../src/lib/appSettings';
import { useLanguageStore, type Locale } from '../../src/store/language';
import { color, space, touch } from '../../src/theme';

function radiusOptions(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((v): v is number => typeof v === 'number')
    : [2000, 3000];
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <Text weight={600}>{label}</Text>
        {hint ? (
          <Text variant="caption" color="grey700">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: color.grey300, true: color.ink }}
        thumbColor={color.paper}
      />
    </View>
  );
}

/**
 * C-25 Settings: language, radius 2 / 3 km, pickup reminders, marketing
 * pushes, Devanagari digits. Changes show at once (optimistic) and are saved
 * to the profile; language and digits also apply on this device right away.
 */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { locale, digits, setLocale, setDigits } = useLanguageStore();
  const { data: profile } = useMyProfile();
  const update = useUpdateProfile();
  const radii = radiusOptions(useAppSettings().data?.radius_options_m);
  const radius = profile?.radius_m ?? radii[0] ?? 2000;

  const chooseLanguage = (next: Locale) => {
    setLocale(next); // no restart: every screen re-renders in the new language
    update.mutate({ locale: next });
  };

  const setDevanagari = (on: boolean) => {
    setDigits(on ? 'devanagari' : 'latin');
    update.mutate({ devanagari_digits: on });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
        <Text variant="title">{t('profile.settings')}</Text>

        <View style={styles.section}>
          <Text variant="button">{t('settings.language')}</Text>
          <View style={styles.row}>
            <Chip
              label={t('settings.languageName', { lng: 'ne' })}
              selected={locale === 'ne'}
              onPress={() => chooseLanguage('ne')}
            />
            <Chip
              label={t('settings.languageName', { lng: 'en' })}
              selected={locale === 'en'}
              onPress={() => chooseLanguage('en')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="button">{t('settings.radius')}</Text>
          <Text variant="caption" color="grey700">
            {t('settings.radiusHint')}
          </Text>
          <View style={styles.row}>
            {radii.map((m) => (
              <Chip
                key={m}
                label={t('settings.km', { km: toDigits(String(m / 1000), digits) })}
                selected={radius === m}
                onPress={() => update.mutate({ radius_m: m })}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ToggleRow
            label={t('settings.pickupReminders')}
            hint={t('settings.pickupRemindersHint')}
            value={profile?.pickup_reminders ?? true}
            onChange={(v) => update.mutate({ pickup_reminders: v })}
          />
          <ToggleRow
            label={t('settings.marketing')}
            hint={t('settings.marketingHint')}
            value={profile?.marketing_pushes ?? false}
            onChange={(v) => update.mutate({ marketing_pushes: v })}
          />
          <ToggleRow
            label={t('kit.digits')}
            hint={t('settings.digitsHint', { sample: toDigits('250', 'devanagari') })}
            value={digits === 'devanagari'}
            onChange={setDevanagari}
          />
        </View>

        {update.isError ? <Text weight={600}>{`⚠ ${t('settings.saveFailed')}`}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  flex: { flex: 1 },
  content: { padding: space.l, gap: space.xl },
  section: { gap: space.s },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  toggle: {
    minHeight: touch + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    borderBottomWidth: 1,
    borderBottomColor: color.grey300,
    paddingVertical: space.s,
  },
});
