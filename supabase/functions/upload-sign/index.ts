// upload-sign (T3.2): gives the signed-in owner a one-time signed upload URL
// for the public-images bucket. Checks type (JPEG, PNG, WebP), size
// (<= 1 MB after compression), the path prefix and that the caller owns the
// vendor / is the user in the path. App users have no write policy on
// public-images, so this is the only way in.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

import { checkUpload } from './rules.ts';

const BUCKET = 'public-images';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'VALIDATION_FAILED' });

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'NOT_AUTHENTICATED' });

  // Who is calling (their own JWT, checked by Auth).
  const asUser = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser(
    authHeader.slice('Bearer '.length),
  );
  const user = userData?.user;
  if (userError || !user) return json(401, { error: 'NOT_AUTHENTICATED' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'VALIDATION_FAILED' });
  }
  const check = checkUpload({ path: body.path, contentType: body.contentType, size: body.size });
  if (!check.ok) return json(400, { error: check.error, field: check.field });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: profile } = await admin
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) return json(403, { error: 'FORBIDDEN' });
  if (profile.status !== 'active') return json(403, { error: 'ACCOUNT_SUSPENDED' });

  const target = check.target;
  if (target.kind === 'avatar') {
    if (target.userId !== user.id) return json(403, { error: 'FORBIDDEN' });
  } else {
    const { data: vendor } = await admin
      .from('vendors')
      .select('id')
      .eq('id', target.vendorId)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!vendor) return json(403, { error: 'FORBIDDEN' });
  }

  const path = String(body.path).toLowerCase();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true });
  if (error || !data) {
    console.error(`[upload-sign] could not sign ${path}: ${error?.message}`);
    return json(500, { error: 'UNKNOWN' });
  }
  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return json(200, {
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: pub.publicUrl,
  });
});
