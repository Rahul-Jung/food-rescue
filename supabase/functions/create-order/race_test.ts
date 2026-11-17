// T6.6 done-when: two parallel requests for the last unit, exactly one
// succeeds. Needs a running local Supabase, so it only runs with RACE_TEST=1
// (CI's plain Deno job skips it):
//   RACE_TEST=1 SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=... \
//     deno test --no-config --no-lock --allow-env --allow-net supabase/functions/create-order/race_test.ts
import { assertEquals } from 'jsr:@std/assert@1';
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

function enabled(): boolean {
  try {
    return Deno.env.get('RACE_TEST') === '1';
  } catch {
    return false;
  }
}

Deno.test({
  name: 'two parallel orders for the last unit: exactly one succeeds',
  ignore: !enabled(),
  async fn() {
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
    // A live seeded offer and two active customers.
    const { data: offer } = await db
      .from('offers')
      .select('id, quantity_total, quantity_reserved')
      .eq('status', 'live')
      .eq('offer_kind', 'surplus')
      .gt('expires_at', new Date(Date.now() + 15 * 60_000).toISOString())
      .limit(1)
      .single();
    if (!offer) throw new Error('needs a live seeded offer');
    // Two fresh customers (the sign-up trigger makes their profiles).
    const buyers: { id: string }[] = [];
    for (const n of [1, 2]) {
      const { data, error } = await db.auth.admin.createUser({
        email: `race${n}-${crypto.randomUUID()}@example.test`,
        email_confirm: true,
      });
      if (error || !data.user) throw new Error('could not create a test customer');
      buyers.push({ id: data.user.id });
    }

    // Leave exactly one unit.
    await db
      .from('offers')
      .update({ quantity_reserved: offer.quantity_total - 1 })
      .eq('id', offer.id);

    const call = (customer: string) =>
      db.rpc('create_order_hold', { p_customer_id: customer, p_offer_id: offer.id, p_quantity: 1 });
    const results = await Promise.all([call(buyers[0].id), call(buyers[1].id)]);
    const ok = results.filter((r) => !r.error);
    const refused = results.filter((r) => r.error);
    assertEquals(ok.length, 1);
    assertEquals(refused[0]?.error?.message, 'QUANTITY_EXCEEDED');

    // Undo: the hold expires, then the offer gets its old count back.
    await db
      .from('offers')
      .update({ quantity_reserved: offer.quantity_reserved, status: 'live' })
      .eq('id', offer.id);
  },
});
