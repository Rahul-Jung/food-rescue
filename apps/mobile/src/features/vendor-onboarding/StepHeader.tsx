import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '../../components';
import { space } from '../../theme';

/** "Step 1 of 3" + title, shared by V-02 to V-04. */
export function StepHeader({ step, title }: { step: 1 | 2 | 3; title: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text variant="caption" color="grey700">
        {t('vendorOnboarding.stepOf', { step, total: 3 })}
      </Text>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: space.xs } });
