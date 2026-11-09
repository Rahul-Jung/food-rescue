import { formatNpMobile } from '@food-rescue/shared';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../src/components';
import { supabase } from '../src/lib/supabase';
import { useLanguageStore } from '../src/store/language';
import { useLocationStore } from '../src/store/location';
import { useSessionStore } from '../src/store/session';
import { color, space } from '../src/theme';

/** Placeholder customer home until C-06 (later task). */
export default function Home() {
  const { t } = useTranslation();
  const locale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);
  const user = useSessionStore((s) => s.session?.user);
  const point = useLocationStore((s) => s.point);
  const who = user?.phone
    ? formatNpMobile(`+${user.phone.replace(/^\+/, '')}`)
    : (user?.email ?? '');

  return (
    <View style={styles.container}>
      <Text variant="title">{t('app.name')}</Text>
      <Text>{t('app.tagline')}</Text>
      {who ? <Text color="grey700">{t('home.signedInAs', { who })}</Text> : null}
      {point ? (
        <Text color="grey700">
          {point.source === 'area' ? t('home.area', { area: point.areaName }) : t('home.nearMe')}
        </Text>
      ) : null}
      <Button
        variant="secondary"
        label={t('settings.switchLanguage')}
        onPress={() => setLocale(locale === 'en' ? 'ne' : 'en')}
      />
      <Button
        variant="ghost"
        label={t('home.signOut')}
        onPress={() => void supabase.auth.signOut()}
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
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.m,
    padding: space.xl,
    backgroundColor: color.paper,
  },
});
