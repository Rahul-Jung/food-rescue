import * as Application from 'expo-application';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../../src/components';
import { color, space } from '../../src/theme';

export default function UpdateRequired() {
  const { t } = useTranslation();
  const id = Application.applicationId ?? 'np.foodrescue.app';
  const open = () =>
    Linking.openURL(`market://details?id=${id}`).catch(() =>
      Linking.openURL(`https://play.google.com/store/apps/details?id=${id}`),
    );
  return (
    <View style={styles.wrap}>
      <Text variant="title" style={styles.center}>
        {t('system.updateTitle')}
      </Text>
      <Text style={styles.center}>{t('errors.APP_UPDATE_REQUIRED')}</Text>
      <Button label={t('system.updateButton')} onPress={open} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: space.xl,
    gap: space.l,
    backgroundColor: color.paper,
  },
  center: { textAlign: 'center' },
});
