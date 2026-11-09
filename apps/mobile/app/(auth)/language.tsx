import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../../src/components';
import { useLanguageStore, type Locale } from '../../src/store/language';
import { useOnboardingStore } from '../../src/store/onboarding';
import { color, space } from '../../src/theme';

/** C-01 Choose language: first launch only; saved on the device; no restart. */
export default function LanguageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setLocale = useLanguageStore((s) => s.setLocale);
  const setLanguageChosen = useOnboardingStore((s) => s.setLanguageChosen);

  const choose = (locale: Locale) => {
    setLocale(locale);
    setLanguageChosen();
    router.replace('/intro');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text variant="title" style={styles.center}>
          {t('auth.language.title')}
        </Text>
        <Text color="grey700" style={styles.center}>
          {t('auth.language.subtitle')}
        </Text>
        <View style={styles.buttons}>
          <Button label={t('settings.languageName', { lng: 'ne' })} onPress={() => choose('ne')} />
          <Button
            variant="secondary"
            label={t('settings.languageName', { lng: 'en' })}
            onPress={() => choose('en')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  wrap: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.l },
  center: { textAlign: 'center' },
  buttons: { gap: space.m, marginTop: space.l },
});
