import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

interface SessionState {
  /** False until the stored session has been read at start-up. */
  ready: boolean;
  session: Session | null;
  /** Signed in from a password-reset link: must set a new password first. */
  passwordRecovery: boolean;
  setSession: (session: Session | null) => void;
  setPasswordRecovery: (on: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  ready: false,
  session: null,
  passwordRecovery: false,
  setSession: (session) =>
    set((s) => ({ session, ready: true, passwordRecovery: session ? s.passwordRecovery : false })),
  setPasswordRecovery: (passwordRecovery) => set({ passwordRecovery }),
}));
