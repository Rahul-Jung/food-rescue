export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'collected',
  'no_show',
  'cancelled_by_customer',
  'cancelled_by_vendor',
  'refunded',
  'expired_hold',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed moves, mirroring transition_order() (plan section 4). */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending_payment: ['paid', 'expired_hold'],
  paid: ['collected', 'no_show', 'cancelled_by_customer', 'cancelled_by_vendor'],
  collected: ['refunded'],
  no_show: ['refunded'],
  cancelled_by_customer: ['refunded'],
  cancelled_by_vendor: ['refunded'],
  refunded: [],
  expired_hold: [],
};

/** States with no outgoing move at all. */
export const ORDER_TERMINAL_STATUSES: readonly OrderStatus[] = ORDER_STATUSES.filter(
  (s) => ORDER_TRANSITIONS[s].length === 0,
);

/** Statuses that count as "open" (block offer or account deletion). */
export const OPEN_ORDER_STATUSES: readonly OrderStatus[] = ['pending_payment', 'paid'];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}
