// create-order (T6.6): C-13 "Reserve". Checks the caller's JWT, then calls
// create_order_hold with the service role, which in one transaction locks the
// offer row (SELECT ... FOR UPDATE), checks quantity left, max per order and
// the rate limit, snapshots the price and commission rate, and creates the
// pending_payment order with a hold of hold_minutes. Returns order_id, total
// and hold_expires_at. The amount always comes from the database.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

import { mapDbError, parseOrderRequest } from './rules.ts';

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

  const asUser = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser(
    authHeader.slice('Bearer '.length),
  );
  const user = userData?.user;
  if (userError || !user) return json(401, { error: 'NOT_AUTHENTICATED' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'VALIDATION_FAILED', field: 'body' });
  }
  const parsed = parseOrderRequest(body);
  if (!parsed.ok) return json(400, { error: parsed.error, field: parsed.field });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc('create_order_hold', {
    p_customer_id: user.id,
    p_offer_id: parsed.value.offerId,
    p_quantity: parsed.value.quantity,
  });
  if (error) {
    const mapped = mapDbError(error.message);
    if (mapped.status === 500) console.error(`[create-order] ${error.message}`);
    return json(mapped.status, { error: mapped.error, field: error.details ?? undefined });
  }
  const order = data as {
    id: string;
    quantity: number;
    unit_price: number;
    total: number;
    hold_expires_at: string;
    status: string;
  };
  return json(200, {
    order_id: order.id,
    status: order.status,
    quantity: order.quantity,
    unit_price: order.unit_price,
    total: order.total,
    hold_expires_at: order.hold_expires_at,
    server_now: new Date().toISOString(),
  });
});
