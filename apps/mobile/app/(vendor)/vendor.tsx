import { formatNpMobile } from '@food-rescue/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../../src/components';
import { logout } from '../../src/features/auth/logout';
import { useLanguageStore } from '../../src/store/language';
import { useSessionStore } from '../../src/store/session';
import { color, space } from '../../src/theme';

/**
 * Vendor home placeholder (T2.7 role routing). Served at /vendor because the
 * customer home already owns "/". The real vendor screens come in Sprint 3.
 */
export default function VendorHome() {
  const { t } = useTranslation();
  const user = useSessionStore((s) => s.session?.user);
  const { locale, setLocale } = useLanguageStore();
  const who = user?.phone
    ? formatNpMobile(`+${user.phone.replace(/^\+/, '')}`)
    : (user?.email ?? '');

  return (
    <View style={styles.container}>
      <Text variant="title">{t('vendorHome.title')}</Text>
      <Text color="grey700">{t('vendorHome.body')}</Text>
      {who ? <Text color="grey700">{t('home.signedInAs', { who })}</Text> : null}
      <Button
        variant="secondary"
        label={t('settings.switchLanguage')}
        onPress={() => setLocale(locale === 'en' ? 'ne' : 'en')}
      />
      <Button variant="secondary" label={t('home.signOut')} onPress={() => void logout()} />
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
