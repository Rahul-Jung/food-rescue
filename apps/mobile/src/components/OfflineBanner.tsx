import { useNetInfo } from '@react-native-community/netinfo';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { color, space } from '../theme';
import { Text } from './Text';

/** Shown at the top whenever the phone has no connection; screens keep showing cached data. */
export function OfflineBanner({ preview = false }: { preview?: boolean }) {
  const { t } = useTranslation();
  const { isConnected } = useNetInfo();
  const insets = useSafeAreaInsets();
  if (!preview && isConnected !== false) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.bar, { paddingTop: (preview ? 0 : insets.top) + space.s }]}
    >
      <Text variant="body" weight={600} color="paper">
        {`⚠ ${t('system.offline')}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.ink, paddingHorizontal: space.l, paddingBottom: space.s },
});
