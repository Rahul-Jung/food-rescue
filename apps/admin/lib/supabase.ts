import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Public URL + anon key only (never the service role key). Sessions live in
// cookies (@supabase/ssr) so the proxy, server components and route handlers
// all see the same signed-in admin. Admin writes go through admin_* RPCs.

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function hasSupabaseConfig() {
  return Boolean(url() && anonKey());
}

/** Server components, server actions and route handlers. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(url(), anonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a server component: the proxy refreshes cookies instead.
        }
      },
    },
  });
}

// Browser client: lib/supabaseBrowser.ts (this file is server-only: next/headers).
