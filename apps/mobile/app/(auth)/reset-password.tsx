import { passwordSchema } from '@food-rescue/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Input, Text } from '../../src/components';
import { isAuthFailure, updatePassword } from '../../src/features/auth/api';
import { useSessionStore } from '../../src/store/session';
import { color, space } from '../../src/theme';

/** Opened from the reset-password email link: set a new password. */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const setPasswordRecovery = useSessionStore((s) => s.setPasswordRecovery);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setError(null);
    if (!passwordSchema.safeParse(password).success) {
      setError(t('auth.email.passwordRules'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.reset.mismatch'));
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      // Done: the routing gate continues to location / home.
      setPasswordRecovery(false);
    } catch (e) {
      setError(t(`errors.${isAuthFailure(e) ? e.code : 'UNKNOWN'}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text variant="title">{t('auth.reset.newTitle')}</Text>
        <Input
          label={t('auth.reset.newLabel')}
          hint={t('auth.email.passwordRules')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Input
          label={t('auth.reset.confirmLabel')}
          error={error ?? undefined}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={() => void save()}
        />
        <Button label={t('auth.reset.save')} loading={busy} onPress={() => void save()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  wrap: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.l },
});
