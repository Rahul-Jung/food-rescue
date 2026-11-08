import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { color, radius, space, touch } from '../theme';
import { Text } from './Text';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  accessibilityLabel: string;
}

/** One hidden input behind N boxes, so paste and SMS autofill work. */
export function OtpInput({ value, onChange, length = 6, accessibilityLabel }: OtpInputProps) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel={accessibilityLabel}>
      <View style={styles.row}>
        {Array.from({ length }, (_, i) => (
          <View key={i} style={[styles.box, i === value.length && styles.active]}>
            <Text variant="title">{value[i] ?? ''}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.s },
  box: {
    width: touch,
    minHeight: touch + 8,
    borderWidth: 1,
    borderColor: color.grey300,
    borderRadius: radius.box,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { borderColor: color.ink, borderWidth: 2 },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
