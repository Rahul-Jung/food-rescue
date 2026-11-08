import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useLanguageStore } from '../store/language';
import { color as colors, fontFamily, fontSize, lineHeight, maxFontScale, type FontWeight, type TextVariant } from '../theme';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: FontWeight;
  color?: keyof typeof colors;
  strike?: boolean;
}

/** All app text goes through this so font, size and line height follow the locale. */
export function Text({ variant = 'body', weight, color = 'ink', strike, style, ...rest }: TextProps) {
  const locale = useLanguageStore((s) => s.locale);
  const w: FontWeight = weight ?? (variant === 'button' || variant === 'title' || variant === 'number' ? 600 : 400);
  const size = fontSize[variant];
  return (
    <RNText
      maxFontSizeMultiplier={maxFontScale}
      style={[
        {
          fontFamily: fontFamily(locale, w),
          fontSize: size,
          lineHeight: lineHeight(locale, size),
          color: colors[color],
          textDecorationLine: strike ? 'line-through' : 'none',
        },
        style,
      ]}
      {...rest}
    />
  );
}
