import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { color } from '../../src/theme';

/**
 * Landing route for foodrescue://auth-callback (verify-email link). The link
 * itself is handled by useAuthDeepLinks; the routing gate moves on once the
 * session is stored.
 */
export default function AuthCallback() {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap} accessibilityLabel={t('common.loading')}>
      <ActivityIndicator color={color.ink} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.paper },
});
