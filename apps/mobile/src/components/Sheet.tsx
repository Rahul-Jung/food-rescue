import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { color, radius, space } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Bottom sheet on a plain Modal (no native dependency). */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text variant="title">{title}</Text>
        {children}
        <Button variant="ghost" label={t('common.close')} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.box * 2,
    borderTopRightRadius: radius.box * 2,
    padding: space.xl,
    gap: space.l,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: color.grey300 },
});
