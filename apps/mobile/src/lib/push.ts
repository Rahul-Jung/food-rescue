// Push registration (T3.7): ask once after sign-in, get the Expo push token
// and save it with register_push_token (upsert, last_seen). send-push reads
// the tokens and removes the ones Expo reports as dead. The inbox rows are
// the source of truth, so a refused permission loses nothing.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useSessionStore } from '../store/session';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Returns the token it registered, or null when push is not available. */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Food Rescue',
      // No `sound` here: a name means a bundled custom file; leaving it out
      // uses the phone's default notification sound.
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const { error } = await supabase.rpc('register_push_token', {
    p_expo_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw error;
  return token;
}

/** Registers once per signed-in user and app start. */
export function usePushRegistration() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const status = useSessionStore((s) => s.status);
  const doneFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || status !== 'active' || doneFor.current === userId) return;
    doneFor.current = userId;
    registerForPush().catch(() => {
      // Push is optional; try again on the next start.
      doneFor.current = null;
    });
  }, [userId, status]);
}
