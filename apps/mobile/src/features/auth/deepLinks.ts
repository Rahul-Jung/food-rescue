// Email links (verify email, reset password) come back to the app as
//   foodrescue://auth-callback#access_token=...&refresh_token=...&type=signup
//   foodrescue://reset-password#access_token=...&refresh_token=...&type=recovery
// or with ?error=...&error_code=otp_expired when the link is old or used.

export type AuthLink =
  | { kind: 'session'; type: string; accessToken: string; refreshToken: string }
  | { kind: 'error'; code: string }
  | { kind: 'none' };

/** Reads the Supabase params from a deep link (hash first, then query). */
export function parseAuthLink(url: string | null | undefined): AuthLink {
  if (!url) return { kind: 'none' };
  const hashAt = url.indexOf('#');
  const queryAt = url.indexOf('?');
  const params = new URLSearchParams();
  const add = (part: string) => new URLSearchParams(part).forEach((v, k) => params.set(k, v));
  if (queryAt !== -1) add(url.slice(queryAt + 1, hashAt === -1 ? undefined : hashAt));
  if (hashAt !== -1) add(url.slice(hashAt + 1));

  const error = params.get('error_code') ?? params.get('error');
  if (error) return { kind: 'error', code: error };

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    return { kind: 'session', type: params.get('type') ?? '', accessToken, refreshToken };
  }
  return { kind: 'none' };
}

/** True for the password-reset link (go to the set-new-password screen). */
export function isRecoveryLink(link: AuthLink): boolean {
  return link.kind === 'session' && link.type === 'recovery';
}
