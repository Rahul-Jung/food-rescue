import { Pressable, StyleSheet } from 'react-native';

import { color, radius, space, touch } from '../theme';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text variant="body" weight={600} color={selected ? 'paper' : 'ink'}>
        {selected ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touch,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.ink,
    justifyContent: 'center',
    backgroundColor: color.paper,
  },
  selected: { backgroundColor: color.ink },
});
