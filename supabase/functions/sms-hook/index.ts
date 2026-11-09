// Supabase Auth "Send SMS" hook (T2.3). Auth calls this instead of its own
// SMS provider. Steps: verify the webhook signature, enforce the per-phone
// limit (3 per 15 min, otp_send_allowed), build the message, send it.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { Webhook } from 'npm:standardwebhooks@1.0.0';

import { buildOtpMessage, maskPhone, smsLocale, toE164 } from './message.ts';
import { getProvider } from './providers.ts';

interface SendSmsPayload {
  user: { id: string; phone: string; user_metadata?: Record<string, unknown> };
  sms: { otp: string };
}

// Auth reads { error: { http_code, message } } from a 200 response and passes
// it to the app. Other statuses read as a broken hook (429 / 503 = "hook
// unavailable", 4xx = "invalid payload"), so the HTTP status stays 200.
function hookError(httpCode: number, message: string) {
  return new Response(JSON.stringify({ error: { http_code: httpCode, message } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const secret = (Deno.env.get('SEND_SMS_HOOK_SECRET') ?? '').replace('v1,whsec_', '');
  if (!secret) return hookError(500, 'sms-hook is not configured');

  const body = await req.text();
  let payload: SendSmsPayload;
  try {
    payload = new Webhook(secret).verify(body, Object.fromEntries(req.headers)) as SendSmsPayload;
  } catch {
    return hookError(401, 'Invalid signature');
  }

  const phone = toE164(payload.user.phone);
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data: allowed, error } = await admin.rpc('otp_send_allowed', { p_phone: phone });
  if (error) {
    console.error(`[sms-hook] limit check failed for ${maskPhone(phone)}: ${error.message}`);
    return hookError(error.code === '22023' ? 400 : 500, error.message);
  }
  if (!allowed) {
    console.warn(`[sms-hook] RATE_LIMITED ${maskPhone(phone)}`);
    return hookError(429, 'RATE_LIMITED');
  }

  try {
    const text = buildOtpMessage(payload.sms.otp, smsLocale(payload.user.user_metadata));
    await getProvider(Deno.env).send(phone, text);
  } catch (e) {
    console.error(`[sms-hook] send failed for ${maskPhone(phone)}: ${(e as Error).message}`);
    return hookError(502, 'SMS could not be sent');
  }

  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
});
