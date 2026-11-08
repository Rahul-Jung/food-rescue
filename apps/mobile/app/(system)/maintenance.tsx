import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../../src/components';
import { useAppSettings } from '../../src/lib/appSettings';
import { color, space } from '../../src/theme';

export default function Maintenance() {
  const { t } = useTranslation();
  const { refetch, isFetching } = useAppSettings();
  return (
    <View style={styles.wrap}>
      <Text variant="title" style={styles.center}>
        {t('system.maintenanceTitle')}
      </Text>
      <Text style={styles.center}>{t('errors.MAINTENANCE')}</Text>
      <Button
        variant="secondary"
        label={t('common.retry')}
        loading={isFetching}
        onPress={() => void refetch()}
      />
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
