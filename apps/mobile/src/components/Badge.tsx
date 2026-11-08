import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { color, radius, space } from '../theme';
import { Text } from './Text';

export type BadgeKind = 'live' | 'happyHour' | 'soldOut' | 'paid' | 'collected';

// Each state has its own icon and style, so it never depends on colour alone.
const ICON: Record<BadgeKind, string> = {
  live: '●',
  happyHour: '☀',
  soldOut: '✕',
  paid: '✓',
  collected: '✓✓',
};

export function Badge({ kind }: { kind: BadgeKind }) {
  const { t } = useTranslation();
  const filled = kind === 'live' || kind === 'paid';
  return (
    <View style={[styles.badge, filled ? styles.filled : styles.outline, kind === 'soldOut' && styles.dashed]}>
      <Text variant="caption" weight={600} color={filled ? 'paper' : 'ink'}>
        {`${ICON[kind]} ${t(`badges.${kind}`)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: space.s,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: color.ink,
  },
  filled: { backgroundColor: color.ink },
  outline: { backgroundColor: color.paper },
  dashed: { borderStyle: 'dashed', borderColor: color.grey500 },
});
