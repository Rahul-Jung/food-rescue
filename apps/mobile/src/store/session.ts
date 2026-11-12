import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

export type AppRole = 'customer' | 'vendor' | 'admin';
export type AppStatus = 'active' | 'suspended' | 'deleted';

/** Reads the custom claims the T2.1 token hook puts in the access token. */
export function claimsFromToken(accessToken: string | undefined): {
  role: AppRole | null;
  status: AppStatus | null;
} {
  if (!accessToken) return { role: null, status: null };
  try {
    const part = accessToken.split('.')[1] ?? '';
    const json = JSON.parse(globalThis.atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    const role = ['customer', 'vendor', 'admin'].includes(json.app_role) ? json.app_role : null;
    const status = ['active', 'suspended', 'deleted'].includes(json.app_status)
      ? json.app_status
      : null;
    return { role, status };
  } catch {
    return { role: null, status: null };
  }
}

interface SessionState {
  /** False until the stored session has been read at start-up. */
  ready: boolean;
  session: Session | null;
  /** From the JWT (app_role / app_status), refreshed with every token. */
  role: AppRole | null;
  status: AppStatus | null;
  /** Signed in from a password-reset link: must set a new password first. */
  passwordRecovery: boolean;
  setSession: (session: Session | null) => void;
  /** Server said ACCOUNT_SUSPENDED mid-session: block at once. */
  setStatus: (status: AppStatus) => void;
  setPasswordRecovery: (on: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  ready: false,
  session: null,
  role: null,
  status: null,
  passwordRecovery: false,
  setSession: (session) =>
    set((s) => ({
      session,
      ready: true,
      ...claimsFromToken(session?.access_token),
      passwordRecovery: session ? s.passwordRecovery : false,
    })),
  setStatus: (status) => set({ status }),
  setPasswordRecovery: (passwordRecovery) => set({ passwordRecovery }),
}));

/** Selectors used by screens and the route gate. */
export const selectSignedIn = (s: SessionState) => s.session !== null;
export const selectRole = (s: SessionState) => s.role ?? 'customer';
export const selectBlocked = (s: SessionState) =>
  s.session !== null && (s.status === 'suspended' || s.status === 'deleted');
