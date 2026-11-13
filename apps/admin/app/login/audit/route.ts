import { NextResponse, type NextRequest } from 'next/server';

import { supabaseServer } from '@/lib/supabase';

/**
 * AD-01: after TOTP succeeds (aal2) the login page calls this, so the
 * audit_log row gets the IP and user agent seen by the server, not values
 * the browser chose. admin_log_login refuses unless the caller is aal2.
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') ?? '';
  const { error } = await supabase.rpc('admin_log_login', { p_ip: ip, p_user_agent: userAgent });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
