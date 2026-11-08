import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { color, radius, space, touch } from '../theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

/** danger is an outline with a warning mark, so it reads without colour. */
export function Button({ label, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const filled = variant === 'primary';
  const fg = filled ? 'paper' : 'ink';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        filled && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 },
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={filled ? color.paper : color.ink} /> : null}
        {variant === 'danger' ? <Text variant="button">⚠</Text> : null}
        <Text variant="button" color={fg} style={variant === 'ghost' && styles.ghostText}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch,
    minWidth: touch,
    paddingHorizontal: space.l,
    paddingVertical: space.s,
    borderRadius: radius.box,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  primary: { backgroundColor: color.ink },
  secondary: { borderWidth: 1, borderColor: color.ink, backgroundColor: color.paper },
  danger: { borderWidth: 2, borderColor: color.ink, backgroundColor: color.paper },
  ghostText: { textDecorationLine: 'underline' },
});
