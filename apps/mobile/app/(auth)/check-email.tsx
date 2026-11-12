import { isOtpLocked, OTP_MAX_WRONG, resendSecondsLeft, toDigits } from '@food-rescue/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, OtpInput, Text } from '../../src/components';
import { isAuthFailure, resendConfirmation, verifyEmailCode } from '../../src/features/auth/api';
import { useLanguageStore } from '../../src/store/language';
import { useOtpLockStore } from '../../src/store/otpLock';
import { color, space } from '../../src/theme';

const RESEND_SECONDS = 60;

/** Verify email: "check your email" after sign-up, with a resend. */
export default function CheckEmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const digits = useLanguageStore((s) => s.digits);
  const [sentAt, setSentAt] = useState<number>(Date.now());
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const wait = resendSecondsLeft(sentAt, now, RESEND_SECONDS);
  const lock = useOtpLockStore((s) => s.locks[email]);
  const registerWrong = useOtpLockStore((s) => s.registerWrong);
  const locked = isOtpLocked(lock ?? { wrong: 0, lockedUntil: null }, now);

  const verify = async (value: string) => {
    if (locked) return;
    setMessage(null);
    try {
      // Confirms the email and signs in; the routing gate moves on.
      await verifyEmailCode(email, value, 'signup');
    } catch (e) {
      setCode('');
      if (isAuthFailure(e) && e.code === 'CODE_INVALID') {
        const next = registerWrong(email);
        setMessage(
          isOtpLocked(next, Date.now())
            ? t('errors.CODE_LOCKED')
            : t('auth.otp.wrong', { left: toDigits(String(OTP_MAX_WRONG - next.wrong), digits) }),
        );
      } else {
        setMessage(t(`errors.${isAuthFailure(e) ? e.code : 'UNKNOWN'}`));
      }
    }
  };

  const resend = async () => {
    setMessage(null);
    try {
      await resendConfirmation(email);
      setSentAt(Date.now());
      setMessage(t('auth.email.resent'));
    } catch (e) {
      setMessage(t(`errors.${isAuthFailure(e) ? e.code : 'UNKNOWN'}`));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text variant="title">{t('auth.email.checkTitle')}</Text>
        <Text>{t('auth.email.checkBody', { email })}</Text>
        <Text weight={600}>{t('auth.email.codeHint')}</Text>
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (v.length === 6) void verify(v);
          }}
          accessibilityLabel={t('auth.otp.enterCode')}
        />
        <Text color="grey700">{t('auth.email.checkHint')}</Text>
        {message ? <Text weight={600}>{message}</Text> : null}
        <Button
          variant="secondary"
          disabled={wait > 0}
          label={
            wait > 0
              ? t('auth.email.resendIn', { seconds: toDigits(String(wait), digits) })
              : t('auth.email.resend')
          }
          onPress={() => void resend()}
        />
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
