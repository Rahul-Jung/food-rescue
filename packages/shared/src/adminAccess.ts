// Admin panel access rule (T2.8, AD-01; plan section 8: "TOTP required,
// 12-hour session"). Pure so the proxy's decisions are unit tested.

/** Admin sessions end 12 hours after the password sign-in. */
export const ADMIN_SESSION_HOURS = 12;

export interface AdminAccessInput {
  signedIn: boolean;
  /** JWT app_role / app_status (T2.1 hook). */
  role?: string | null;
  status?: string | null;
  /** JWT aal: 'aal1' after the password, 'aal2' after TOTP. */
  aal?: string | null;
  /** Epoch seconds of the password sign-in (from the JWT amr claim). */
  signedInAt?: number | null;
  /** Epoch seconds now. */
  now: number;
}

export type AdminAccess =
  | { allow: true }
  | {
      allow: false;
      /** Where to send the user. */
      redirect: '/login' | '/login/mfa';
      /** Sign the session out first (wrong role, blocked or expired). */
      signOut: boolean;
      reason: 'no_session' | 'not_admin' | 'blocked' | 'expired' | 'needs_totp';
    };

export function decideAdminAccess(i: AdminAccessInput): AdminAccess {
  if (!i.signedIn) {
    return { allow: false, redirect: '/login', signOut: false, reason: 'no_session' };
  }
  if (i.role !== 'admin') {
    return { allow: false, redirect: '/login', signOut: true, reason: 'not_admin' };
  }
  if (i.status && i.status !== 'active') {
    return { allow: false, redirect: '/login', signOut: true, reason: 'blocked' };
  }
  if (!i.signedInAt || i.now - i.signedInAt > ADMIN_SESSION_HOURS * 3600) {
    return { allow: false, redirect: '/login', signOut: true, reason: 'expired' };
  }
  if (i.aal !== 'aal2') {
    return { allow: false, redirect: '/login/mfa', signOut: false, reason: 'needs_totp' };
  }
  return { allow: true };
}

/** Earliest password sign-in time from the JWT `amr` claim (epoch seconds). */
export function passwordSignInTime(amr: unknown): number | null {
  if (!Array.isArray(amr)) return null;
  const times = amr
    .filter((m) => m && typeof m === 'object' && (m as { method?: unknown }).method === 'password')
    .map((m) => Number((m as { timestamp?: unknown }).timestamp))
    .filter((t) => Number.isFinite(t) && t > 0);
  return times.length ? Math.min(...times) : null;
}
