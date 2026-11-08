import { AppError, ERROR_CODES, errorMessageKey, isErrorCode, toAppError } from './errors';
import { canTransition, ORDER_STATUSES, ORDER_TERMINAL_STATUSES } from './orderStates';
import { npPhoneSchema, orderStatusSchema, paisaSchema, timestamptzSchema } from './schemas';

describe('order states', () => {
  it('has the 8 statuses from the plan', () => {
    expect(ORDER_STATUSES).toHaveLength(8);
  });

  it('allows only listed moves', () => {
    expect(canTransition('pending_payment', 'paid')).toBe(true);
    expect(canTransition('paid', 'collected')).toBe(true);
    expect(canTransition('collected', 'refunded')).toBe(true);
    expect(canTransition('pending_payment', 'collected')).toBe(false);
    expect(canTransition('refunded', 'paid')).toBe(false);
    expect(canTransition('expired_hold', 'paid')).toBe(false);
  });

  it('treats refunded and expired_hold as terminal', () => {
    expect([...ORDER_TERMINAL_STATUSES].sort()).toEqual(['expired_hold', 'refunded']);
  });
});

describe('errors', () => {
  it('maps codes to i18n keys', () => {
    expect(errorMessageKey('OFFER_UNAVAILABLE')).toBe('errors.OFFER_UNAVAILABLE');
    expect(ERROR_CODES).toContain('CANCEL_WINDOW_PASSED');
  });

  it('never leaks raw database messages', () => {
    expect(toAppError({ message: 'HOLD_EXPIRED' }).code).toBe('HOLD_EXPIRED');
    expect(toAppError({ message: 'duplicate key value violates unique constraint' }).code).toBe('UNKNOWN');
    expect(toAppError(new AppError('FORBIDDEN')).code).toBe('FORBIDDEN');
    expect(isErrorCode('NOPE')).toBe(false);
  });
});

describe('base schemas', () => {
  it('accepts integer paisa only', () => {
    expect(paisaSchema.safeParse(25000).success).toBe(true);
    expect(paisaSchema.safeParse(250.5).success).toBe(false);
    expect(paisaSchema.safeParse(-1).success).toBe(false);
  });

  it('validates Nepal mobile numbers', () => {
    expect(npPhoneSchema.safeParse('+9779812345678').success).toBe(true);
    expect(npPhoneSchema.safeParse('9812345678').success).toBe(false);
    expect(npPhoneSchema.safeParse('+9779612345678').success).toBe(false);
  });

  it('needs an offset on timestamps', () => {
    expect(timestamptzSchema.safeParse('2026-11-08T17:30:00+05:45').success).toBe(true);
    expect(timestamptzSchema.safeParse('2026-11-08T17:30:00').success).toBe(false);
  });

  it('mirrors the order_status enum', () => {
    expect(orderStatusSchema.options).toEqual([...ORDER_STATUSES]);
  });
});
