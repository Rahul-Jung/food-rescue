import { loginEmailSchema } from '@food-rescue/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Input, Text } from '../../src/components';
import { isAuthFailure, sendPasswordReset } from '../../src/features/auth/api';
import { color, space } from '../../src/theme';

/** Forgot password: sends a reset link that opens the app's set-new-password screen. */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setError(null);
    const parsed = loginEmailSchema.safeParse(email);
    if (!parsed.success) {
      setError(t('auth.login.emailInvalid'));
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(parsed.data);
      // Same answer whether or not the account exists.
      setSent(true);
    } catch (e) {
      setError(t(`errors.${isAuthFailure(e) ? e.code : 'UNKNOWN'}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text variant="title">{t('auth.reset.forgotTitle')}</Text>
        {sent ? (
          <Text>{t('auth.reset.sent', { email: email.trim() })}</Text>
        ) : (
          <>
            <Text color="grey700">{t('auth.reset.forgotBody')}</Text>
            <Input
              label={t('auth.login.emailLabel')}
              error={error ?? undefined}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              onSubmitEditing={() => void send()}
            />
            <Button label={t('auth.reset.sendLink')} loading={busy} onPress={() => void send()} />
          </>
        )}
        <Button
          variant="ghost"
          label={t('auth.email.backToLogin')}
          onPress={() => router.replace({ pathname: '/login', params: { tab: 'email' } })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  wrap: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.l },
});
