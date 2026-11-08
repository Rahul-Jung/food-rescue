import { divRoundHalfUp } from './money';

export const BP_DENOMINATOR = 10_000;

/** commission = round_half_up(total × rate_bp / 10000), all in paisa (plan section 7). */
export function commissionPaisa(totalPaisa: number, rateBp: number): number {
  if (!Number.isSafeInteger(totalPaisa) || totalPaisa < 0) throw new RangeError('total must be non-negative paisa');
  if (!Number.isInteger(rateBp) || rateBp < 0 || rateBp > 5000) throw new RangeError('rate must be 0-5000 bp');
  return divRoundHalfUp(totalPaisa * rateBp, BP_DENOMINATOR);
}

/** 0 bp while the order was created before commission_free_until, else the vendor rate. */
export function effectiveRateBp(orderCreatedAt: Date, commissionFreeUntil: Date | null, vendorRateBp: number): number {
  if (commissionFreeUntil && orderCreatedAt.getTime() < commissionFreeUntil.getTime()) return 0;
  return vendorRateBp;
}

/** What the vendor keeps after commission. */
export function vendorSharePaisa(totalPaisa: number, rateBp: number): number {
  return totalPaisa - commissionPaisa(totalPaisa, rateBp);
}
