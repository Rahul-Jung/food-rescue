import { loginEmailSchema, toNpMobileE164 } from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Chip, Input, Text } from '../../src/components';
import { isAuthFailure, sendOtp, type AuthChannel } from '../../src/features/auth/api';
import { useLanguageStore } from '../../src/store/language';
import { useOtpLockStore } from '../../src/store/otpLock';
import { useSessionStore } from '../../src/store/session';
import { useVendorIntentStore } from '../../src/store/vendorIntent';
import { color, space } from '../../src/theme';

/**
 * V-01 Business sign-up: the same OTP flow as C-03 / C-04. It remembers the
 * intended role (vendor); after the code is verified the app calls
 * start_vendor_signup, which sets the role and creates a draft vendor row,
 * and the new business account lands on V-02.
 */
export default function BusinessSignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useLanguageStore((s) => s.locale);
  const markSent = useOtpLockStore((s) => s.markSent);
  const setWantsVendor = useVendorIntentStore((s) => s.setWantsVendor);
  const [tab, setTab] = useState<AuthChannel>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setError(null);
    let id: string | null;
    if (tab === 'phone') {
      id = toNpMobileE164(phone);
      if (!id) {
        setError(t('auth.login.phoneInvalid'));
        return;
      }
    } else {
      const parsed = loginEmailSchema.safeParse(email);
      if (!parsed.success) {
        setError(t('auth.login.emailInvalid'));
        return;
      }
      id = parsed.data;
    }
    setBusy(true);
    try {
      setWantsVendor(true);
      await sendOtp(tab, id, locale);
      markSent(id);
      useSessionStore.getState().setOtpPending(true);
      router.push({ pathname: '/otp', params: { channel: tab, id } });
    } catch (e) {
      setWantsVendor(false);
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
          <Text variant="title">{t('auth.business.title')}</Text>
          <Text color="grey700">{t('auth.business.body')}</Text>

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
                  onSubmitEditing={() => void send()}
                />
              </View>
            </View>
          ) : (
            <Input
              label={t('auth.login.emailLabel')}
              hint={t('auth.business.emailHint')}
              error={error ?? undefined}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="name@example.com"
              onSubmitEditing={() => void send()}
            />
          )}

          <Button label={t('auth.business.sendCode')} loading={busy} onPress={() => void send()} />
          <Button variant="ghost" label={t('auth.business.back')} onPress={() => router.back()} />
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
});
