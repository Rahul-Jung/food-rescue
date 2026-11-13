import { createBrowserClient } from '@supabase/ssr';

/** Client components (login, TOTP enrolment / challenge). Public URL + anon key only. */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  );
}
