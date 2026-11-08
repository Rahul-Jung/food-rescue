import { formatPrice, toDigits } from '@food-rescue/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useLanguageStore } from '../store/language';
import { space } from '../theme';
import { Text } from './Text';

export interface PriceTagProps {
  pricePaisa: number;
  originalPaisa?: number;
}

/** Price, struck original and discount %, all in the user's locale and digits. */
export function PriceTag({ pricePaisa, originalPaisa }: PriceTagProps) {
  const { t } = useTranslation();
  const locale = useLanguageStore((s) => s.locale);
  const digits = useLanguageStore((s) => s.digits);
  const fmt = (p: number) => formatPrice(p, locale, digits);
  const pct =
    originalPaisa && originalPaisa > pricePaisa ? Math.round(100 - (pricePaisa * 100) / originalPaisa) : null;

  return (
    <View style={styles.row}>
      <Text variant="title">{fmt(pricePaisa)}</Text>
      {pct !== null && originalPaisa ? (
        <>
          <Text
            variant="body"
            color="grey500"
            strike
            accessibilityLabel={t('price.was', { price: fmt(originalPaisa) })}
          >
            {fmt(originalPaisa)}
          </Text>
          <Text variant="caption" weight={600}>
            {t('price.off', { pct: toDigits(String(pct), digits) })}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: space.s },
});
