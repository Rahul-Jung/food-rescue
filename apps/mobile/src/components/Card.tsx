import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { color, radius, space } from '../theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({ children, onPress, accessibilityLabel }: CardProps) {
  if (!onPress) return <View style={styles.card}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.grey300,
    borderRadius: radius.box,
    padding: space.l,
    gap: space.s,
  },
});
