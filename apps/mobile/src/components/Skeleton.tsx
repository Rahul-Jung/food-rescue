import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue } from 'react-native';
import { useTranslation } from 'react-i18next';

import { color, radius } from '../theme';

export function Skeleton({
  width = '100%',
  height = 16,
}: {
  width?: DimensionValue;
  height?: number;
}) {
  const { t } = useTranslation();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      accessibilityLabel={t('common.loading')}
      style={{ width, height, opacity, borderRadius: radius.box, backgroundColor: color.grey100 }}
    />
  );
}
