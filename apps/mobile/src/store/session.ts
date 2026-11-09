import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

interface SessionState {
  /** False until the stored session has been read at start-up. */
  ready: boolean;
  session: Session | null;
  setSession: (session: Session | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  ready: false,
  session: null,
  setSession: (session) => set({ session, ready: true }),
}));
