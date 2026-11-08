/** Error codes every RPC / Edge Function returns (plan section 6). The app shows errors.<CODE>. */
export const ERROR_CODES = [
  'NOT_AUTHENTICATED',
  'FORBIDDEN',
  'ACCOUNT_SUSPENDED',
  'VALIDATION_FAILED',
  'VENDOR_NOT_APPROVED',
  'OFFER_UNAVAILABLE',
  'QUANTITY_EXCEEDED',
  'STALE_VERSION',
  'RATE_LIMITED',
  'HOLD_EXPIRED',
  'PAYMENT_NOT_VERIFIED',
  'AMOUNT_MISMATCH',
  'CODE_INVALID',
  'CODE_LOCKED',
  'OUTSIDE_PICKUP_WINDOW',
  'ALREADY_COLLECTED',
  'CANCEL_WINDOW_PASSED',
  'OPEN_ORDERS_EXIST',
  'BELOW_MIN_WITHDRAWAL',
  'INSUFFICIENT_BALANCE',
  'OPEN_WITHDRAWAL_EXISTS',
  'PAYOUT_ACCOUNT_MISSING',
  'REVIEW_NOT_ALLOWED',
  'APP_UPDATE_REQUIRED',
  'MAINTENANCE',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Fallback when a server message is not one of our codes: never show raw DB text. */
export const UNKNOWN_ERROR = 'UNKNOWN' as const;

export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  readonly code: ErrorCode | typeof UNKNOWN_ERROR;
  readonly fieldErrors?: FieldErrors;

  constructor(code: ErrorCode | typeof UNKNOWN_ERROR, fieldErrors?: FieldErrors) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
}

/** i18n key for an error code, e.g. errors.OFFER_UNAVAILABLE. */
export function errorMessageKey(code: ErrorCode | typeof UNKNOWN_ERROR): string {
  return `errors.${code}`;
}

/** Turn anything thrown by supabase-js / fetch into an AppError with a known code. */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const message =
    typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : '';
  const code = message.trim();
  return new AppError(isErrorCode(code) ? code : UNKNOWN_ERROR);
}
