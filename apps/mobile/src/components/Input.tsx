import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useLanguageStore } from '../store/language';
import { color, fontFamily, fontSize, maxFontScale, radius, space, touch } from '../theme';
import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, ...rest }: InputProps) {
  const locale = useLanguageStore((s) => s.locale);
  return (
    <View style={styles.wrap}>
      <Text variant="caption" weight={600}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        maxFontSizeMultiplier={maxFontScale}
        placeholderTextColor={color.grey500}
        style={[
          styles.input,
          { fontFamily: fontFamily(locale, 400), fontSize: fontSize.button },
          !!error && styles.inputError,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption">⚠ {error}</Text>
      ) : hint ? (
        <Text variant="caption" color="grey500">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: {
    minHeight: touch + 4,
    borderWidth: 1,
    borderColor: color.grey300,
    borderRadius: radius.box,
    paddingHorizontal: space.m,
    paddingVertical: space.s,
    color: color.ink,
    backgroundColor: color.paper,
  },
  inputError: { borderColor: color.ink, borderWidth: 2 },
});
