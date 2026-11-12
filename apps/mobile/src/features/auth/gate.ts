// Splash routing (plan: first launch -> language, intro once, then login,
// then location, then home). Pure so it can be unit tested.

export type AuthStep = 'language' | 'intro' | 'login' | 'reset-password' | 'location' | 'app';

export interface GateInput {
  languageChosen: boolean;
  introSeen: boolean;
  signedIn: boolean;
  locationDone: boolean;
  /** Signed in from a password-reset link (T2.5). */
  passwordRecovery?: boolean;
}

export function authStep(s: GateInput): AuthStep {
  // A reset link must end on "set a new password", whatever else is pending.
  if (s.signedIn && s.passwordRecovery) return 'reset-password';
  if (!s.languageChosen) return 'language';
  if (!s.introSeen) return 'intro';
  if (!s.signedIn) return 'login';
  if (!s.locationDone) return 'location';
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
    case 'reset-password':
      return ['reset-password'];
    case 'location':
      return ['location'];
    default:
      return [];
  }
}
