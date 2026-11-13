import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, ListRow, Text } from '../../src/components';
import { logout } from '../../src/features/auth/logout';
import { useAppSettings } from '../../src/lib/appSettings';
import { useSessionStore } from '../../src/store/session';
import { color, space } from '../../src/theme';

const asText = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);

/** T2.7: suspended or deleted account. Support contact and Log out only. */
export default function BlockedScreen() {
  const { t } = useTranslation();
  const status = useSessionStore((s) => s.status);
  const settings = useAppSettings().data;
  const phone = asText(settings?.support_phone);
  const email = asText(settings?.support_email);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text variant="title">{`⚠ ${t('blocked.title')}`}</Text>
        <Text>
          {status === 'deleted' ? t('blocked.deletedBody') : t('errors.ACCOUNT_SUSPENDED')}
        </Text>
        <Text color="grey700">{t('blocked.contactHint')}</Text>
        <View>
          {phone ? (
            <ListRow
              title={t('blocked.callSupport')}
              subtitle={phone}
              onPress={() => void Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)}
            />
          ) : null}
          {email ? (
            <ListRow
              title={t('blocked.emailSupport')}
              subtitle={email}
              onPress={() => void Linking.openURL(`mailto:${email}`)}
            />
          ) : null}
        </View>
        <Button variant="secondary" label={t('home.signOut')} onPress={() => void logout()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  wrap: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.l },
});
