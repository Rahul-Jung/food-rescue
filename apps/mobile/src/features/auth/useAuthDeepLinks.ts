import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { supabase } from '../../lib/supabase';
import { useSessionStore } from '../../store/session';
import { isRecoveryLink, parseAuthLink } from './deepLinks';

/**
 * Handles the verify-email and reset-password links: stores the session they
 * carry, then opens the set-new-password screen for a reset link.
 */
export function useAuthDeepLinks() {
  const router = useRouter();
  const setPasswordRecovery = useSessionStore((s) => s.setPasswordRecovery);

  useEffect(() => {
    const handle = async (url: string | null) => {
      const link = parseAuthLink(url);
      if (link.kind === 'error') {
        router.replace({ pathname: '/login', params: { tab: 'email', linkError: link.code } });
        return;
      }
      if (link.kind !== 'session') return;
      const recovery = isRecoveryLink(link);
      if (recovery) setPasswordRecovery(true);
      const { error } = await supabase.auth.setSession({
        access_token: link.accessToken,
        refresh_token: link.refreshToken,
      });
      if (error) {
        setPasswordRecovery(false);
        router.replace({ pathname: '/login', params: { tab: 'email', linkError: 'otp_expired' } });
      } else if (recovery) {
        router.replace('/reset-password');
      }
    };

    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => void handle(url));
    return () => sub.remove();
  }, [router, setPasswordRecovery]);
}
