import { decideAdminAccess, passwordSignInTime } from '@food-rescue/shared';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// T2.8 (plan: middleware requiring aal2; Next 16 renamed middleware.ts to
// proxy.ts). Every page except /login* needs a signed-in admin who passed TOTP
// (aal2) within the last 12 hours. The database enforces the same rule
// (admin RLS policies require app_role admin and aal2).

function claims(token: string | undefined): Record<string, unknown> {
  if (!token) return {};
  try {
    return JSON.parse(atob((token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() checks the token with Auth (and refreshes it if needed).
  const { data: userData } = await supabase.auth.getUser();
  if (request.nextUrl.pathname.startsWith('/login')) return response;

  const { data: sessionData } = await supabase.auth.getSession();
  const c = claims(sessionData.session?.access_token);
  const decision = decideAdminAccess({
    signedIn: Boolean(userData.user && sessionData.session),
    role: c.app_role as string | undefined,
    status: c.app_status as string | undefined,
    aal: c.aal as string | undefined,
    signedInAt: passwordSignInTime(c.amr),
    now: Math.floor(Date.now() / 1000),
  });
  if (decision.allow) return response;

  if (decision.signOut) await supabase.auth.signOut();
  const target = request.nextUrl.clone();
  target.pathname = decision.redirect;
  target.search = decision.reason === 'needs_totp' ? '' : `?reason=${decision.reason}`;
  const redirect = NextResponse.redirect(target);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Everything except Next internals and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
