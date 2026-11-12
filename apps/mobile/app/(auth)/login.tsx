import { loginEmailSchema, passwordSchema, toNpMobileE164 } from '@food-rescue/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Chip, Input, Text } from '../../src/components';
import {
  isAuthFailure,
  sendOtp,
  signInWithPassword,
  signUpWithPassword,
  type AuthChannel,
} from '../../src/features/auth/api';
import { useLanguageStore } from '../../src/store/language';
import { useOtpLockStore } from '../../src/store/otpLock';
import { color, space } from '../../src/theme';

type EmailMode = 'signin' | 'signup';

/**
 * C-03 Log in or sign up: phone / email tabs, +977 format check, business link.
 * Email tab (T2.5): email + password, create account, forgot password, and an
 * emailed code as the fallback when SMS is down.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; linkError?: string }>();
  const locale = useLanguageStore((s) => s.locale);
  const markSent = useOtpLockStore((s) => s.markSent);
  const [tab, setTab] = useState<AuthChannel>(params.tab === 'email' ? 'email' : 'phone');
  const [mode, setMode] = useState<EmailMode>('signin');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    params.linkError ? t('auth.email.linkExpired') : null,
  );
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const failureText = (e: unknown) => t(`errors.${isAuthFailure(e) ? e.code : 'UNKNOWN'}`);

  const sendPhoneCode = async () => {
    const id = toNpMobileE164(phone);
    if (!id) {
      setError(t('auth.login.phoneInvalid'));
      return;
    }
    try {
      await sendOtp('phone', id, locale);
      markSent(id);
      router.push({ pathname: '/otp', params: { channel: 'phone', id } });
    } catch (e) {
      if (isAuthFailure(e) && e.smsDown) {
        setError(t('auth.otp.smsDown'));
        setTab('email');
      } else {
        setError(failureText(e));
      }
    }
  };

  const validEmail = (): string | null => {
    const parsed = loginEmailSchema.safeParse(email);
    if (!parsed.success) {
      setError(t('auth.login.emailInvalid'));
      return null;
    }
    return parsed.data;
  };

  const emailPassword = async () => {
    const id = validEmail();
    if (!id) return;
    if (mode === 'signup') {
      const check = passwordSchema.safeParse(password);
      if (!check.success) {
        setPasswordError(t('auth.email.passwordRules'));
        return;
      }
    } else if (!password) {
      setPasswordError(t('auth.email.passwordRequired'));
      return;
    }
    try {
      if (mode === 'signup') {
        await signUpWithPassword(id, password, locale);
        router.push({ pathname: '/check-email', params: { email: id } });
      } else {
        await signInWithPassword(id, password);
        // Signed in: the routing gate moves on to location / home.
      }
    } catch (e) {
      if (isAuthFailure(e) && e.code === 'EMAIL_NOT_CONFIRMED') {
        router.push({ pathname: '/check-email', params: { email: id } });
        return;
      }
      setError(failureText(e));
    }
  };

  const emailCode = async () => {
    setError(null);
    const id = validEmail();
    if (!id) return;
    setBusy(true);
    try {
      await sendOtp('email', id, locale);
      markSent(id);
      router.push({ pathname: '/otp', params: { channel: 'email', id } });
    } catch (e) {
      setError(failureText(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setError(null);
    setPasswordError(null);
    setBusy(true);
    try {
      if (tab === 'phone') await sendPhoneCode();
      else await emailPassword();
    } finally {
      setBusy(false);
    }
  };

  const switchTab = (next: AuthChannel) => {
    setTab(next);
    setError(null);
    setPasswordError(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="title">{t('auth.login.title')}</Text>
          <Text color="grey700">
            {tab === 'phone' ? t('auth.login.subtitle') : t('auth.email.subtitle')}
          </Text>

          <View style={styles.tabs} accessibilityRole="tablist">
            <Chip
              label={t('auth.login.tabPhone')}
              selected={tab === 'phone'}
              onPress={() => switchTab('phone')}
            />
            <Chip
              label={t('auth.login.tabEmail')}
              selected={tab === 'email'}
              onPress={() => switchTab('email')}
            />
          </View>

          {tab === 'phone' ? (
            <View style={styles.phoneRow}>
              <Text variant="button" style={styles.prefix}>
                +977
              </Text>
              <View style={styles.flex}>
                <Input
                  label={t('auth.login.phoneLabel')}
                  hint={t('auth.login.phoneHint')}
                  error={error ?? undefined}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  placeholder="98XXXXXXXX"
                  maxLength={14}
                  onSubmitEditing={() => void submit()}
                />
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.tabs}>
                <Chip
                  label={t('auth.email.signIn')}
                  selected={mode === 'signin'}
                  onPress={() => setMode('signin')}
                />
                <Chip
                  label={t('auth.email.signUp')}
                  selected={mode === 'signup'}
                  onPress={() => setMode('signup')}
                />
              </View>
              <Input
                label={t('auth.login.emailLabel')}
                error={error ?? undefined}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="name@example.com"
              />
              <Input
                label={t('auth.email.passwordLabel')}
                hint={mode === 'signup' ? t('auth.email.passwordRules') : undefined}
                error={passwordError ?? undefined}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                onSubmitEditing={() => void submit()}
              />
            </View>
          )}

          <Button
            label={
              tab === 'phone'
                ? t('auth.login.continue')
                : mode === 'signup'
                  ? t('auth.email.createAccount')
                  : t('auth.email.logIn')
            }
            loading={busy}
            onPress={() => void submit()}
          />

          {tab === 'email' ? (
            <View style={styles.links}>
              <Button
                variant="ghost"
                label={t('auth.email.forgot')}
                onPress={() =>
                  router.push({ pathname: '/forgot-password', params: { email: email.trim() } })
                }
              />
              <Button
                variant="ghost"
                label={t('auth.email.codeInstead')}
                onPress={() => void emailCode()}
              />
            </View>
          ) : null}

          <View style={styles.business}>
            <Button
              variant="ghost"
              label={t('auth.login.business')}
              onPress={() => router.push('/business')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  flex: { flex: 1 },
  content: { padding: space.xl, gap: space.l },
  tabs: { flexDirection: 'row', gap: space.s },
  form: { gap: space.m },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s },
  prefix: { paddingTop: 30 },
  links: { alignItems: 'center', gap: space.xs },
  business: { marginTop: space.xl, alignItems: 'center' },
});
