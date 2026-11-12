import { isOtpLocked, loginEmailSchema, OTP_MAX_WRONG, toDigits } from '@food-rescue/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Input, OtpInput, Text } from '../../src/components';
import { isAuthFailure, sendPasswordReset, verifyEmailCode } from '../../src/features/auth/api';
import { useLanguageStore } from '../../src/store/language';
import { useOtpLockStore } from '../../src/store/otpLock';
import { useSessionStore } from '../../src/store/session';
import { color, space } from '../../src/theme';

/**
 * Forgot password: emails a reset link (opens the app) and a 6-digit code.
 * Typing the code here works in any email app; both lead to "Set a new password".
 */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const digits = useLanguageStore((s) => s.digits);
  const setPasswordRecovery = useSessionStore((s) => s.setPasswordRecovery);
  const registerWrong = useOtpLockStore((s) => s.registerWrong);
  const [email, setEmail] = useState(params.email ?? '');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useOtpLockStore((s) => (sentTo ? s.locks[sentTo] : undefined));

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
      setSentTo(parsed.data);
    } catch (e) {
      setError(t(`errors.${isAuthFailure(e) ? e.code : 'UNKNOWN'}`));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (!sentTo || isOtpLocked(lock ?? { wrong: 0, lockedUntil: null }, Date.now())) {
      setError(t('errors.CODE_LOCKED'));
      return;
    }
    setError(null);
    setPasswordRecovery(true);
    try {
      await verifyEmailCode(sentTo, value, 'recovery');
      // Signed in for recovery: the routing gate opens "Set a new password".
    } catch (e) {
      setPasswordRecovery(false);
      setCode('');
      if (isAuthFailure(e) && e.code === 'CODE_INVALID') {
        const next = registerWrong(sentTo);
        setError(
          isOtpLocked(next, Date.now())
            ? t('errors.CODE_LOCKED')
            : t('auth.otp.wrong', { left: toDigits(String(OTP_MAX_WRONG - next.wrong), digits) }),
        );
      } else {
        setError(t(`errors.${isAuthFailure(e) ? e.code : 'UNKNOWN'}`));
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text variant="title">{t('auth.reset.forgotTitle')}</Text>
        {sentTo ? (
          <>
            <Text>{t('auth.reset.sent', { email: sentTo })}</Text>
            <Text weight={600}>{t('auth.email.codeHint')}</Text>
            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                if (v.length === 6) void verify(v);
              }}
              accessibilityLabel={t('auth.otp.enterCode')}
            />
            {error ? <Text weight={600}>{error}</Text> : null}
          </>
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
