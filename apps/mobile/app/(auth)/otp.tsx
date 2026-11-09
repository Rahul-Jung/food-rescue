import {
  formatNpMobile,
  isOtpLocked,
  OTP_MAX_WRONG,
  otpLockSecondsLeft,
  resendSecondsLeft,
  toDigits,
} from '@food-rescue/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, OtpInput, Text } from '../../src/components';
import { isAuthFailure, sendOtp, verifyOtp, type AuthChannel } from '../../src/features/auth/api';
import { useAppSettings } from '../../src/lib/appSettings';
import { useLanguageStore } from '../../src/store/language';
import { useOtpLockStore } from '../../src/store/otpLock';
import { color, space } from '../../src/theme';

/** C-04 Enter OTP: 6 boxes; resend after 30 s; 5 wrong = 15 min lock; SMS down = offer email. */
export default function OtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { channel: rawChannel, id = '' } = useLocalSearchParams<{
    channel?: string;
    id?: string;
  }>();
  const channel: AuthChannel = rawChannel === 'email' ? 'email' : 'phone';
  const { locale, digits } = useLanguageStore();
  const settings = useAppSettings().data;
  const resendSeconds =
    typeof settings?.otp_resend_seconds === 'number' ? settings.otp_resend_seconds : 30;

  const lock = useOtpLockStore((s) => s.locks[id]);
  const lastSent = useOtpLockStore((s) => s.lastSent[id] ?? null);
  const { registerWrong, clear, markSent } = useOtpLockStore();

  const [code, setCode] = useState('');
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState<string | null>(null);
  const [smsDown, setSmsDown] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const state = lock ?? { wrong: 0, lockedUntil: null };
  const locked = isOtpLocked(state, now);
  const lockMinutes = Math.ceil(otpLockSecondsLeft(state, now) / 60);
  const resendIn = resendSecondsLeft(lastSent, now, resendSeconds);
  const shownId = channel === 'phone' ? formatNpMobile(id) : id;

  const verify = async (value: string) => {
    if (locked || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await verifyOtp(channel, id, value);
      clear(id);
      router.replace('/location');
    } catch (e) {
      setCode('');
      if (isAuthFailure(e) && e.code === 'CODE_INVALID') {
        const next = registerWrong(id);
        setMessage(
          isOtpLocked(next, Date.now())
            ? t('errors.CODE_LOCKED')
            : t('auth.otp.wrong', { left: toDigits(String(OTP_MAX_WRONG - next.wrong), digits) }),
        );
      } else {
        setMessage(t(`errors.${isAuthFailure(e) ? e.code : 'UNKNOWN'}`));
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setMessage(null);
    setSmsDown(false);
    try {
      await sendOtp(channel, id, locale);
      markSent(id);
      setMessage(t('auth.otp.resent'));
    } catch (e) {
      if (isAuthFailure(e) && e.smsDown) setSmsDown(true);
      else setMessage(t(`errors.${isAuthFailure(e) ? e.code : 'UNKNOWN'}`));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="title">{t('auth.otp.title')}</Text>
        <Text color="grey700">{t('auth.otp.sentTo', { id: shownId })}</Text>

        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (v.length === 6) void verify(v);
          }}
          accessibilityLabel={t('auth.otp.enterCode')}
        />

        {locked ? (
          <Text weight={600} accessibilityLiveRegion="polite">
            {`⚠ ${t('auth.otp.locked', { minutes: toDigits(String(lockMinutes), digits) })}`}
          </Text>
        ) : message ? (
          <Text weight={600} accessibilityLiveRegion="polite">
            {message}
          </Text>
        ) : null}

        {busy ? <Text color="grey700">{t('auth.otp.verifying')}</Text> : null}

        {smsDown ? (
          <View style={styles.smsDown}>
            <Text>{`⚠ ${t('auth.otp.smsDown')}`}</Text>
            <Button
              variant="secondary"
              label={t('auth.otp.useEmail')}
              onPress={() => router.replace({ pathname: '/login', params: { tab: 'email' } })}
            />
          </View>
        ) : null}

        <Button
          variant="secondary"
          disabled={resendIn > 0 || locked}
          label={
            resendIn > 0
              ? t('auth.otp.resendIn', { seconds: toDigits(String(resendIn), digits) })
              : t('auth.otp.resend')
          }
          onPress={() => void resend()}
        />
        <Button
          variant="ghost"
          label={channel === 'phone' ? t('auth.otp.changeNumber') : t('auth.otp.changeEmail')}
          onPress={() => router.replace('/login')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  content: { padding: space.xl, gap: space.l },
  smsDown: { gap: space.s },
});
