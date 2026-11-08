import { toDigits } from '@food-rescue/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useLanguageStore } from '../store/language';
import { color, radius, space, touch } from '../theme';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
}

export function Stepper({ value, onChange, min = 1, max }: StepperProps) {
  const { t } = useTranslation();
  const digits = useLanguageStore((s) => s.digits);
  const step = (d: number) => onChange(Math.min(max, Math.max(min, value + d)));
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityValue={{ min, max, now: value }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.decrease')}
        accessibilityState={{ disabled: value <= min }}
        disabled={value <= min}
        onPress={() => step(-1)}
        style={[styles.btn, value <= min && styles.off]}
      >
        <Text variant="title">−</Text>
      </Pressable>
      <Text variant="title" style={styles.value}>
        {toDigits(String(value), digits)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.increase')}
        accessibilityState={{ disabled: value >= max }}
        disabled={value >= max}
        onPress={() => step(1)}
        style={[styles.btn, value >= max && styles.off]}
      >
        <Text variant="title">+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  btn: {
    width: touch,
    height: touch,
    borderRadius: radius.box,
    borderWidth: 1,
    borderColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { borderColor: color.grey300, opacity: 0.5 },
  value: { minWidth: 32, textAlign: 'center' },
});
