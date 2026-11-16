import { StyleSheet, View } from 'react-native';

import { space } from '../theme';
import { Badge, type BadgeKind } from './Badge';
import { Card } from './Card';
import { PriceTag } from './PriceTag';
import { Text } from './Text';

export interface OfferCardProps {
  title: string;
  vendorName: string;
  /** Already formatted, e.g. pickup window and distance. */
  meta: string;
  /** Absent for a happy hour "x% off" deal, which shows dealLabel instead. */
  pricePaisa?: number | null;
  originalPaisa?: number;
  /** e.g. "25% off" for a deal without a price. */
  dealLabel?: string;
  badges?: BadgeKind[];
  onPress?: () => void;
}

export function OfferCard({
  title,
  vendorName,
  meta,
  pricePaisa,
  originalPaisa,
  dealLabel,
  badges = [],
  onPress,
}: OfferCardProps) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${title}, ${vendorName}`}>
      {badges.length ? (
        <View style={styles.badges}>
          {badges.map((b) => (
            <Badge key={b} kind={b} />
          ))}
        </View>
      ) : null}
      <Text variant="button" numberOfLines={2}>
        {title}
      </Text>
      <Text color="grey700">{vendorName}</Text>
      <Text variant="caption" color="grey500">
        {meta}
      </Text>
      {pricePaisa != null ? (
        <PriceTag pricePaisa={pricePaisa} originalPaisa={originalPaisa} />
      ) : dealLabel ? (
        <Text variant="title">{dealLabel}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
});
