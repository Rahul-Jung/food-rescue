import { commissionPaisa, effectiveRateBp, vendorSharePaisa } from './commission';

describe('commission', () => {
  it('matches the plan example: Rs. 300 at 12% = Rs. 36', () => {
    expect(commissionPaisa(30000, 1200)).toBe(3600);
    expect(vendorSharePaisa(30000, 1200)).toBe(26400);
  });

  it('rounds half up in paisa', () => {
    // 12345 × 1200 / 10000 = 1481.4 -> 1481
    expect(commissionPaisa(12345, 1200)).toBe(1481);
    // 12375 × 1200 / 10000 = 1485.0
    expect(commissionPaisa(12375, 1200)).toBe(1485);
    // 125 × 1200 / 10000 = 15.0; 129 × 1250 / 10000 = 16.125 -> 16
    expect(commissionPaisa(129, 1250)).toBe(16);
    // 1 × 5000 / 10000 = 0.5 -> 1
    expect(commissionPaisa(1, 5000)).toBe(1);
  });

  it('is zero during the free period', () => {
    const freeUntil = new Date('2026-12-01T00:00:00Z');
    expect(effectiveRateBp(new Date('2026-11-30T23:59:59Z'), freeUntil, 1200)).toBe(0);
    expect(effectiveRateBp(new Date('2026-12-01T00:00:00Z'), freeUntil, 1200)).toBe(1200);
    expect(effectiveRateBp(new Date('2026-11-01T00:00:00Z'), null, 1200)).toBe(1200);
  });

  it('rejects bad input', () => {
    expect(() => commissionPaisa(-1, 1200)).toThrow(RangeError);
    expect(() => commissionPaisa(100, 6000)).toThrow(RangeError);
    expect(() => commissionPaisa(100.5, 1200)).toThrow(RangeError);
  });
});
