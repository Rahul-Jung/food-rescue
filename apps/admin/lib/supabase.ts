import { createClient } from '@supabase/supabase-js';

// Public URL + anon key only. Admin writes go through admin_* RPCs under RLS (later tasks).
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
