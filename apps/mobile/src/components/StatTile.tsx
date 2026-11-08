import { StyleSheet, View } from 'react-native';

import { color, radius, space } from '../theme';
import { Text } from './Text';

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text variant="caption" color="grey700">
        {label}
      </Text>
      <Text variant="number">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 140,
    backgroundColor: color.grey100,
    borderRadius: radius.box,
    padding: space.l,
    gap: space.xs,
  },
});
