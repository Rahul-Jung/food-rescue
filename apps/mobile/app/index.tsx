import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useLanguageStore } from '../src/store/language';

export default function Home() {
  const { t } = useTranslation();
  const locale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('app.name')}</Text>
      <Text style={styles.body}>{t('app.tagline')}</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => setLocale(locale === 'en' ? 'ne' : 'en')}
      >
        <Text style={styles.buttonText}>{t('settings.switchLanguage')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF' },
  title: { color: '#000000', fontSize: 20 },
  body: { color: '#000000', fontSize: 14 },
  button: { borderWidth: 1, borderColor: '#000000', paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: '#000000', fontSize: 14 },
});
