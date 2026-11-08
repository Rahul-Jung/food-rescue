import { Pressable, StyleSheet, View } from 'react-native';

import { color, space, touch } from '../theme';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  right?: string;
  onPress?: () => void;
}

export function ListRow({ title, subtitle, right, onPress }: ListRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.grey100 }]}
    >
      <View style={styles.main}>
        <Text weight={600}>{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="grey700">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <Text color="grey700">{right}</Text> : null}
      {onPress ? <Text variant="title">›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingVertical: space.s,
    paddingHorizontal: space.l,
    borderBottomWidth: 1,
    borderBottomColor: color.grey300,
  },
  main: { flex: 1, gap: 2 },
});
