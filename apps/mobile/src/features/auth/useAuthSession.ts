import { useEffect } from 'react';

import { supabase } from '../../lib/supabase';
import { useSessionStore } from '../../store/session';

/** Loads the stored session once and keeps the session store in sync. */
export function useAuthSession() {
  const setSession = useSessionStore((s) => s.setSession);
  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [setSession]);
}
