// Which (vendor) screen a vendor may be on, by their vendor row's status.
// Pure so it can be unit tested. "New business account lands on V-02" (T3.3).
//   draft              -> onboarding steps (V-02 to V-04)
//   submitted          -> V-05 status
//   rejected           -> V-05 status, and the steps to edit and resubmit
//   approved           -> vendor home, business (V-21) and later vendor screens
//   suspended          -> the layout shows a blocked notice (the JWT status also
//                         blocks at the root gate after the next token refresh)

import type { VendorStatus } from './api';

export const ONBOARDING_STEPS = [
  'onboarding/profile',
  'onboarding/location',
  'onboarding/documents',
] as const;
export const STATUS_SCREEN = 'onboarding/status';

/** `screen` is the path inside (vendor), e.g. "vendor" or "onboarding/profile". */
export function vendorRoute(status: VendorStatus | null, screen: string): string | null {
  if (status === null) return null; // still loading / being created
  const isStep = (ONBOARDING_STEPS as readonly string[]).includes(screen);
  const go = (to: string) => (screen === to ? null : `/${to}`);

  switch (status) {
    case 'draft':
      return isStep ? null : go(ONBOARDING_STEPS[0]);
    case 'submitted':
      return go(STATUS_SCREEN);
    case 'rejected':
      return isStep || screen === STATUS_SCREEN ? null : go(STATUS_SCREEN);
    case 'suspended':
      return null;
    case 'approved':
      return screen.startsWith('onboarding/') ? '/vendor' : null;
    default:
      return null;
  }
}

/** The step after this one, or the status screen at the end. */
export function nextStep(screen: string): string {
  const i = (ONBOARDING_STEPS as readonly string[]).indexOf(screen);
  if (i >= 0 && i < ONBOARDING_STEPS.length - 1) return `/${ONBOARDING_STEPS[i + 1]}`;
  return `/${STATUS_SCREEN}`;
}
