import { formatNpMobile } from '@food-rescue/shared';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, ListRow, Skeleton, Text } from '../../../src/components';
import { logout } from '../../../src/features/auth/logout';
import { useMyProfile } from '../../../src/features/profile/hooks';
import { color, space } from '../../../src/theme';

/**
 * C-23 Profile. Edit profile, Settings (language, notifications, radius) and
 * Log out work now; payments, notifications inbox, help, terms, privacy and
 * delete account are built in later tasks and show as "Coming soon".
 */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: profile, isLoading, isError, refetch } = useMyProfile();
  const soon = t('profile.soon');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
        {isLoading ? (
          <View style={styles.header}>
            <Skeleton height={24} width="60%" />
            <Skeleton height={16} width="40%" />
          </View>
        ) : isError ? (
          <View style={styles.header}>
            <Text>{t('errors.UNKNOWN')}</Text>
            <Button variant="secondary" label={t('common.retry')} onPress={() => void refetch()} />
          </View>
        ) : (
          <View style={styles.header}>
            <Text variant="title">{profile?.full_name || t('profile.noName')}</Text>
            {profile?.phone ? <Text color="grey700">{formatNpMobile(profile.phone)}</Text> : null}
            {profile?.email ? <Text color="grey700">{profile.email}</Text> : null}
          </View>
        )}

        <View>
          <ListRow title={t('profile.edit')} onPress={() => router.push('/profile/edit')} />
          <ListRow
            title={t('profile.settings')}
            subtitle={t('profile.settingsHint')}
            onPress={() => router.push('/settings')}
          />
          <ListRow title={t('profile.payments')} right={soon} />
          <ListRow title={t('profile.notifications')} right={soon} />
          <ListRow title={t('profile.help')} right={soon} />
          <ListRow title={t('profile.terms')} right={soon} />
          <ListRow title={t('profile.privacy')} right={soon} />
          <ListRow title={t('profile.deleteAccount')} right={soon} />
        </View>

        <Button variant="danger" label={t('home.signOut')} onPress={() => void logout()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  content: { padding: space.l, gap: space.l },
  header: { gap: space.xs, paddingHorizontal: space.s },
});
