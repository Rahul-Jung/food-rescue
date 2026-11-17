// create-order request rules (T6.6). Pure, so Deno tests cover them without a
// database. The server never takes a price or total from the app: only the
// offer id and the quantity.

export type RuleError = 'VALIDATION_FAILED';

export interface OrderRequest {
  offerId: string;
  quantity: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads { offer_id, quantity } and ignores anything else (price, total, ...). */
export function parseOrderRequest(
  body: unknown,
): { ok: true; value: OrderRequest } | { ok: false; error: RuleError; field: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'VALIDATION_FAILED', field: 'body' };
  }
  const b = body as Record<string, unknown>;
  const offerId = typeof b.offer_id === 'string' ? b.offer_id.trim() : '';
  if (!UUID.test(offerId)) return { ok: false, error: 'VALIDATION_FAILED', field: 'offer_id' };
  const quantity = b.quantity;
  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 100
  ) {
    return { ok: false, error: 'VALIDATION_FAILED', field: 'quantity' };
  }
  return { ok: true, value: { offerId: offerId.toLowerCase(), quantity } };
}

/** Error codes create_order_hold raises, with the HTTP status the app gets. */
const STATUS: Record<string, number> = {
  NOT_AUTHENTICATED: 401,
  ACCOUNT_SUSPENDED: 403,
  FORBIDDEN: 403,
  VALIDATION_FAILED: 400,
  OFFER_UNAVAILABLE: 409,
  QUANTITY_EXCEEDED: 409,
  RATE_LIMITED: 429,
};

/** A Postgres error message to { status, error }; unknown text never reaches the app. */
export function mapDbError(message: string | undefined): { status: number; error: string } {
  const code = (message ?? '').trim();
  if (code in STATUS) return { status: STATUS[code], error: code };
  return { status: 500, error: 'UNKNOWN' };
}
