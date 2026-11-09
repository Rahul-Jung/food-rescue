import { toNpMobileE164 } from '@food-rescue/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Chip, Input, Text } from '../../src/components';
import { isAuthFailure, sendOtp, type AuthChannel } from '../../src/features/auth/api';
import { useLanguageStore } from '../../src/store/language';
import { useOtpLockStore } from '../../src/store/otpLock';
import { color, space } from '../../src/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** C-03 Log in or sign up: phone / email tabs, +977 format check, business link. */
export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const locale = useLanguageStore((s) => s.locale);
  const markSent = useOtpLockStore((s) => s.markSent);
  const [tab, setTab] = useState<AuthChannel>(params.tab === 'email' ? 'email' : 'phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    const id = tab === 'phone' ? toNpMobileE164(phone) : email.trim().toLowerCase();
    if (!id || (tab === 'email' && !EMAIL.test(id))) {
      setError(tab === 'phone' ? t('auth.login.phoneInvalid') : t('auth.login.emailInvalid'));
      return;
    }
    setBusy(true);
    try {
      await sendOtp(tab, id, locale);
      markSent(id);
      router.push({ pathname: '/otp', params: { channel: tab, id } });
    } catch (e) {
      if (isAuthFailure(e) && e.smsDown) {
        setError(t('auth.otp.smsDown'));
        setTab('email');
      } else {
        setError(t(`errors.${isAuthFailure(e) ? e.code : 'UNKNOWN'}`));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="title">{t('auth.login.title')}</Text>
          <Text color="grey700">{t('auth.login.subtitle')}</Text>

          <View style={styles.tabs} accessibilityRole="tablist">
            <Chip
              label={t('auth.login.tabPhone')}
              selected={tab === 'phone'}
              onPress={() => {
                setTab('phone');
                setError(null);
              }}
            />
            <Chip
              label={t('auth.login.tabEmail')}
              selected={tab === 'email'}
              onPress={() => {
                setTab('email');
                setError(null);
              }}
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
              onSubmitEditing={() => void submit()}
            />
          )}

          <Button label={t('auth.login.continue')} loading={busy} onPress={() => void submit()} />

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
  phoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s },
  prefix: { paddingTop: 30 },
  business: { marginTop: space.xl, alignItems: 'center' },
});
