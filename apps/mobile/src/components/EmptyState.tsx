import { StyleSheet, View } from 'react-native';

import { space } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Text variant="title" style={styles.center}>
        {title}
      </Text>
      {body ? (
        <Text color="grey700" style={styles.center}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button variant="secondary" label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.m, padding: space.xl },
  center: { textAlign: 'center' },
});
