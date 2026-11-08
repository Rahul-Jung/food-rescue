import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../src/components';
import { useLanguageStore } from '../src/store/language';
import { color, space } from '../src/theme';

export default function Home() {
  const { t } = useTranslation();
  const locale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);

  return (
    <View style={styles.container}>
      <Text variant="title">{t('app.name')}</Text>
      <Text>{t('app.tagline')}</Text>
      <Button
        variant="secondary"
        label={t('settings.switchLanguage')}
        onPress={() => setLocale(locale === 'en' ? 'ne' : 'en')}
      />
      {__DEV__ ? (
        <Link href="/dev/kit" asChild>
          <Button variant="ghost" label={t('kit.title')} />
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.m, backgroundColor: color.paper },
});
