import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../../src/components';
import { color, space } from '../../src/theme';

/** Placeholder for V-01 business sign-up, which is built in a later task. */
export default function BusinessPlaceholder() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text variant="title" style={styles.center}>
          {t('auth.business.title')}
        </Text>
        <Text color="grey700" style={styles.center}>
          {t('auth.business.body')}
        </Text>
        <Button variant="secondary" label={t('auth.business.back')} onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  wrap: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.l },
  center: { textAlign: 'center' },
});
