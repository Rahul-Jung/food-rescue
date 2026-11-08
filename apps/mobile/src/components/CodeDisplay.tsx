import { toDigits } from '@food-rescue/shared';
import QRCode from 'qrcode';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useLanguageStore } from '../store/language';
import { color, space } from '../theme';
import { Text } from './Text';

/** Pickup code: 6 big digits plus a QR drawn with plain Views (no native SVG). */
export function CodeDisplay({ code, size = 160 }: { code: string; size?: number }) {
  const { t } = useTranslation();
  const digits = useLanguageStore((s) => s.digits);
  const matrix = useMemo(() => {
    const qr = QRCode.create(code, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    return { n, cell: (r: number, c: number) => qr.modules.get(r, c) === 1 };
  }, [code]);
  const px = Math.floor(size / (matrix.n + 2));

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={t('code.label', { code: code.split('').join(' ') })}
    >
      <Text variant="number" style={styles.code}>
        {toDigits(code.replace(/(\d{3})(\d{3})/, '$1 $2'), digits)}
      </Text>
      <View style={[styles.qr, { padding: px }]} importantForAccessibility="no-hide-descendants">
        {Array.from({ length: matrix.n }, (_, r) => (
          <View key={r} style={styles.qrRow}>
            {Array.from({ length: matrix.n }, (_, c) => (
              <View
                key={c}
                style={{
                  width: px,
                  height: px,
                  backgroundColor: matrix.cell(r, c) ? color.ink : color.paper,
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.l },
  code: { letterSpacing: 4 },
  qr: { backgroundColor: color.paper, borderWidth: 1, borderColor: color.grey300 },
  qrRow: { flexDirection: 'row' },
});
