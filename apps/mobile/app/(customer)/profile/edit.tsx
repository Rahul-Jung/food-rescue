import {
  formatNpMobile,
  isOtpLocked,
  OTP_MAX_WRONG,
  profileNameSchema,
  resendSecondsLeft,
  toDigits,
  toAppError,
  toNpMobileE164,
} from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { useEffect, useReducer, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Input, OtpInput, Text } from '../../../src/components';
import { isAuthFailure } from '../../../src/features/auth/api';
import { confirmPhoneChange, startPhoneChange } from '../../../src/features/profile/api';
import { myProfileKey, useMyProfile, useUpdateProfile } from '../../../src/features/profile/hooks';
import { PHONE_CHANGE_START, phoneChangeReducer } from '../../../src/features/profile/phoneChange';
import { useAppSettings } from '../../../src/lib/appSettings';
import { queryClient } from '../../../src/lib/queryClient';
import { useLanguageStore } from '../../../src/store/language';
import { useOtpLockStore } from '../../../src/store/otpLock';
import { useSessionStore } from '../../../src/store/session';
import { color, space } from '../../../src/theme';

/** C-24 Edit profile: name (Devanagari allowed); phone change needs a code sent to the new number. */
export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const digits = useLanguageStore((s) => s.digits);
  const userId = useSessionStore((s) => s.session?.user.id);
  const { data: profile } = useMyProfile();
  const update = useUpdateProfile();
  const settings = useAppSettings().data;
  const resendSeconds =
    typeof settings?.otp_resend_seconds === 'number' ? settings.otp_resend_seconds : 30;

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  useEffect(() => {
    if (profile) setName(profile.full_name ?? '');
  }, [profile]);

  const [phone, dispatch] = useReducer(phoneChangeReducer, PHONE_CHANGE_START);
  const [newPhone, setNewPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const target = 'phone' in phone ? phone.phone : '';
  const lock = useOtpLockStore((s) => (target ? s.locks[target] : undefined));
  const lastSent = useOtpLockStore((s) => (target ? (s.lastSent[target] ?? null) : null));
  const { registerWrong, clear, markSent } = useOtpLockStore();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const saveName = () => {
    setNameError(null);
    setNameSaved(false);
    const parsed = profileNameSchema.safeParse(name);
    if (!parsed.success) {
      setNameError(t('profile.nameRules'));
      return;
    }
    update.mutate(
      { full_name: parsed.data },
      {
        onSuccess: () => setNameSaved(true),
        onError: (e) => setNameError(t(`errors.${toAppError(e).code}`)),
      },
    );
  };

  const sendCode = async (raw: string) => {
    setPhoneMsg(null);
    const e164 = toNpMobileE164(raw);
    if (!e164) {
      setPhoneMsg(t('auth.login.phoneInvalid'));
      return;
    }
    if (e164 === profile?.phone) {
      setPhoneMsg(t('profile.samePhone'));
      return;
    }
    dispatch({ type: 'send', phone: e164 });
    try {
      await startPhoneChange(e164);
      markSent(e164);
      dispatch({ type: 'sent' });
    } catch (e) {
      dispatch({ type: 'sendFailed' });
      setPhoneMsg(t(`errors.${isAuthFailure(e) ? e.code : 'UNKNOWN'}`));
    }
  };

  const verify = async (value: string) => {
    if (phone.step !== 'code') return;
    if (isOtpLocked(lock ?? { wrong: 0, lockedUntil: null }, Date.now())) {
      setPhoneMsg(t('errors.CODE_LOCKED'));
      return;
    }
    dispatch({ type: 'verify' });
    try {
      await confirmPhoneChange(phone.phone, value);
      clear(phone.phone);
      dispatch({ type: 'verified' });
      // The profile picks up the new number (DB trigger); show it at once.
      await queryClient.invalidateQueries({ queryKey: myProfileKey(userId) });
    } catch (e) {
      dispatch({ type: 'verifyFailed' });
      setCode('');
      if (isAuthFailure(e) && e.code === 'CODE_INVALID') {
        const next = registerWrong(phone.phone);
        setPhoneMsg(
          isOtpLocked(next, Date.now())
            ? t('errors.CODE_LOCKED')
            : t('auth.otp.wrong', { left: toDigits(String(OTP_MAX_WRONG - next.wrong), digits) }),
        );
      } else {
        setPhoneMsg(t(`errors.${isAuthFailure(e) ? e.code : 'UNKNOWN'}`));
      }
    }
  };

  const resendIn = resendSecondsLeft(lastSent, now, resendSeconds);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
          <Text variant="title">{t('profile.edit')}</Text>

          <View style={styles.section}>
            <Input
              label={t('profile.nameLabel')}
              hint={t('profile.nameHint')}
              error={nameError ?? undefined}
              value={name}
              onChangeText={(v) => {
                setName(v);
                setNameSaved(false);
              }}
              autoComplete="name"
              textContentType="name"
              maxLength={60}
            />
            {nameSaved ? <Text weight={600}>{`✓ ${t('profile.saved')}`}</Text> : null}
            <Button label={t('profile.saveName')} loading={update.isPending} onPress={saveName} />
          </View>

          <View style={styles.section}>
            <Text variant="button">{t('profile.phoneTitle')}</Text>
            <Text color="grey700">
              {profile?.phone ? formatNpMobile(profile.phone) : t('profile.noPhone')}
            </Text>

            {phone.step === 'done' ? (
              <Text
                weight={600}
              >{`✓ ${t('profile.phoneChanged', { phone: formatNpMobile(phone.phone) })}`}</Text>
            ) : phone.step === 'code' || phone.step === 'verifying' ? (
              <>
                <Text>{t('auth.otp.sentTo', { id: formatNpMobile(phone.phone) })}</Text>
                <OtpInput
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    if (v.length === 6) void verify(v);
                  }}
                  accessibilityLabel={t('auth.otp.enterCode')}
                />
                <Button
                  variant="secondary"
                  disabled={resendIn > 0}
                  label={
                    resendIn > 0
                      ? t('auth.otp.resendIn', { seconds: toDigits(String(resendIn), digits) })
                      : t('auth.otp.resend')
                  }
                  onPress={() => void sendCode(phone.phone)}
                />
                <Button
                  variant="ghost"
                  label={t('auth.otp.changeNumber')}
                  onPress={() => dispatch({ type: 'reset' })}
                />
              </>
            ) : (
              <>
                <View style={styles.phoneRow}>
                  <Text variant="button" style={styles.prefix}>
                    +977
                  </Text>
                  <View style={styles.flex}>
                    <Input
                      label={t('profile.newPhone')}
                      value={newPhone}
                      onChangeText={setNewPhone}
                      keyboardType="phone-pad"
                      placeholder="98XXXXXXXX"
                      maxLength={14}
                    />
                  </View>
                </View>
                <Button
                  variant="secondary"
                  label={t('auth.login.continue')}
                  loading={phone.step === 'sending'}
                  onPress={() => void sendCode(newPhone)}
                />
              </>
            )}
            {phoneMsg ? <Text weight={600}>{phoneMsg}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  flex: { flex: 1 },
  content: { padding: space.l, gap: space.xl },
  section: { gap: space.m },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s },
  prefix: { paddingTop: 30 },
});
