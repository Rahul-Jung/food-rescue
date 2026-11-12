// Splash routing (plan: first launch -> language, intro once, then login,
// then location, then home), and role routing (T2.7): customers go to
// (customer), vendors to (vendor); suspended / deleted users are blocked;
// admins use the admin panel. Pure so it can be unit tested.

import type { AppRole, AppStatus } from '../../store/session';

export type AuthStep =
  | 'language'
  | 'intro'
  | 'login'
  | 'blocked'
  | 'admin-only'
  | 'reset-password'
  | 'location'
  | 'app';

export interface GateInput {
  languageChosen: boolean;
  introSeen: boolean;
  signedIn: boolean;
  locationDone: boolean;
  /** Signed in from a password-reset link (T2.5). */
  passwordRecovery?: boolean;
  /** From the JWT (T2.1 hook); a missing role is treated as customer. */
  role?: AppRole | null;
  status?: AppStatus | null;
}

export function authStep(s: GateInput): AuthStep {
  if (s.signedIn && (s.status === 'suspended' || s.status === 'deleted')) return 'blocked';
  // A reset link must end on "set a new password", whatever else is pending.
  if (s.signedIn && s.passwordRecovery) return 'reset-password';
  if (!s.languageChosen) return 'language';
  if (!s.introSeen) return 'intro';
  if (!s.signedIn) return 'login';
  if (s.role === 'admin') return 'admin-only';
  // The location step picks where a customer searches; vendors skip it.
  if (s.role !== 'vendor' && !s.locationDone) return 'location';
  return 'app';
}

/** Screens of the (auth) group the user may be on for a given step. */
export function allowedAuthScreens(step: AuthStep): string[] {
  switch (step) {
    case 'language':
      return ['language'];
    case 'intro':
      return ['intro'];
    case 'login':
      return ['login', 'otp', 'business', 'forgot-password', 'check-email', 'auth-callback'];
    case 'blocked':
      return ['blocked'];
    case 'admin-only':
      return ['admin-only'];
    case 'reset-password':
      return ['reset-password'];
    case 'location':
      return ['location'];
    default:
      return [];
  }
}

/** Home route per role. */
export function homeFor(role: AppRole | null | undefined): '/' | '/vendor' {
  return role === 'vendor' ? '/vendor' : '/';
}

/**
 * Where to send the user, or null to stay. `group` / `screen` are the first
 * two route segments (e.g. '(customer)', 'profile'). A customer can't open
 * (vendor) routes and a vendor can't open (customer) routes.
 */
export function resolveRoute(
  input: GateInput,
  group: string | undefined,
  screen: string | undefined,
  isDev = false,
): string | null {
  if (group === '(system)' || (isDev && group === 'dev')) return null;
  const step = authStep(input);

  if (step !== 'app') {
    if (group === '(auth)' && allowedAuthScreens(step).includes(screen ?? '')) return null;
    return `/${step}`;
  }

  const home = homeFor(input.role);
  if (group === '(auth)') return home;
  if (input.role === 'vendor' && group !== '(vendor)') return home;
  if (input.role !== 'vendor' && group === '(vendor)') return home;
  return null;
}
