// send-push (T3.7): called by the database webhook on notifications insert
// (0011). Sends the push through the Expo Push API in the receiver's language,
// deletes tokens Expo reports as dead, and for vendor approved / rejected also
// sends an email through Resend. The row itself is the inbox, so a failure
// here never loses the notice.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

import {
  buildEmail,
  buildPushMessages,
  deadTokens,
  EMAIL_TYPES,
  toLocale,
  type ExpoTicket,
  type NotificationRow,
} from './messages.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const RESEND_URL = 'https://api.resend.com/emails';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sameSecret(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('SEND_PUSH_WEBHOOK_SECRET') ?? '';
  if (!secret) return json(500, { error: 'send-push is not configured' });
  if (!sameSecret(req.headers.get('x-webhook-secret') ?? '', secret)) {
    return json(401, { error: 'FORBIDDEN' });
  }

  let id = '';
  try {
    const body = await req.json();
    id = typeof body?.notification_id === 'string' ? body.notification_id : '';
  } catch {
    // fall through
  }
  if (!id) return json(400, { error: 'VALIDATION_FAILED' });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data: n, error } = await admin
    .from('notifications')
    .select('id, user_id, type, title_key, body_key, data')
    .eq('id', id)
    .maybeSingle<NotificationRow>();
  if (error || !n) return json(404, { error: 'VALIDATION_FAILED' });

  const { data: profile } = await admin
    .from('profiles')
    .select('locale, email, status')
    .eq('id', n.user_id)
    .maybeSingle<{ locale: string; email: string | null; status: string }>();
  if (!profile || profile.status !== 'active') return json(200, { skipped: 'inactive' });
  const locale = toLocale(profile.locale);

  // Push --------------------------------------------------------------------
  let sent = 0;
  let removed = 0;
  const { data: tokenRows } = await admin
    .from('push_tokens')
    .select('expo_token')
    .eq('user_id', n.user_id);
  const tokens = (tokenRows ?? []).map((r: { expo_token: string }) => r.expo_token);
  if (tokens.length > 0) {
    const messages = buildPushMessages(n, locale, tokens);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    if (expoToken) headers.Authorization = `Bearer ${expoToken}`;
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
      });
      const out = (await res.json()) as { data?: ExpoTicket[] };
      const tickets = out.data ?? [];
      sent = tickets.filter((t) => t.status === 'ok').length;
      const dead = deadTokens(messages, tickets);
      if (dead.length > 0) {
        await admin.from('push_tokens').delete().in('expo_token', dead);
        removed = dead.length;
      }
    } catch (e) {
      console.error(`[send-push] Expo push failed for ${n.id}: ${(e as Error).message}`);
    }
  }

  // Email (Resend) -------------------------------------------------------------
  let emailed = false;
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') ?? 'Food Rescue <onboarding@resend.dev>';
  if (EMAIL_TYPES.has(n.type) && resendKey) {
    let to = profile.email;
    if (!to) {
      const { data: vendor } = await admin
        .from('vendors')
        .select('email')
        .eq('owner_id', n.user_id)
        .maybeSingle<{ email: string | null }>();
      to = vendor?.email ?? null;
    }
    if (to) {
      const mail = buildEmail(n, locale);
      try {
        const res = await fetch(RESEND_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to: [to],
            subject: mail.subject,
            text: mail.text,
            html: mail.html,
          }),
        });
        emailed = res.ok;
        if (!res.ok) console.error(`[send-push] Resend ${res.status} for ${n.id}`);
      } catch (e) {
        console.error(`[send-push] Resend failed for ${n.id}: ${(e as Error).message}`);
      }
    }
  }

  return json(200, { sent, removed, emailed });
});
