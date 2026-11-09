// Splash routing (plan: first launch -> language, intro once, then login,
// then location, then home). Pure so it can be unit tested.

export type AuthStep = 'language' | 'intro' | 'login' | 'location' | 'app';

export interface GateInput {
  languageChosen: boolean;
  introSeen: boolean;
  signedIn: boolean;
  locationDone: boolean;
}

export function authStep(s: GateInput): AuthStep {
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
      return ['login', 'otp', 'business'];
    case 'location':
      return ['location'];
    default:
      return [];
  }
}
