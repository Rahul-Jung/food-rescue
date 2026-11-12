import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../../src/components';
import { logout } from '../../src/features/auth/logout';
import { color, space } from '../../src/theme';

/** T2.7: admins are not routed into the customer app; they use the admin panel. */
export default function AdminOnlyScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text variant="title">{t('adminOnly.title')}</Text>
        <Text color="grey700">{t('adminOnly.body')}</Text>
        <Button variant="secondary" label={t('home.signOut')} onPress={() => void logout()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  wrap: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.l },
});
