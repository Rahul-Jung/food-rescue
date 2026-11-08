import { divRoundHalfUp, formatPrice } from './money';
import { toDigits } from './digits';

describe('formatPrice', () => {
  it('formats whole rupees in English', () => {
    expect(formatPrice(25000)).toBe('Rs. 250');
    expect(formatPrice(0)).toBe('Rs. 0');
  });

  it('shows paisa only when non-zero', () => {
    expect(formatPrice(25050, 'en')).toBe('Rs. 250.50');
    expect(formatPrice(25005, 'en')).toBe('Rs. 250.05');
  });

  it('uses South Asian grouping', () => {
    expect(formatPrice(125000, 'en')).toBe('Rs. 1,250');
    expect(formatPrice(12500000, 'en')).toBe('Rs. 1,25,000');
    expect(formatPrice(1000000000, 'en')).toBe('Rs. 1,00,00,000');
  });

  it('uses the Nepali prefix with Latin digits by default', () => {
    expect(formatPrice(25000, 'ne')).toBe('रू. 250');
  });

  it('uses Devanagari digits when asked', () => {
    expect(formatPrice(25000, 'ne', 'devanagari')).toBe('रू. २५०');
    expect(formatPrice(125050, 'ne', 'devanagari')).toBe('रू. १,२५०.५०');
  });

  it('rejects non-integer paisa', () => {
    expect(() => formatPrice(10.5)).toThrow(RangeError);
  });
});

describe('toDigits', () => {
  it('maps every digit', () => {
    expect(toDigits('0123456789', 'devanagari')).toBe('०१२३४५६७८९');
    expect(toDigits('42', 'latin')).toBe('42');
  });
});

describe('divRoundHalfUp', () => {
  it('rounds .5 up and below .5 down', () => {
    expect(divRoundHalfUp(5, 10)).toBe(1); // 0.5
    expect(divRoundHalfUp(15, 10)).toBe(2); // 1.5
    expect(divRoundHalfUp(25, 10)).toBe(3); // 2.5 (not banker's 2)
    expect(divRoundHalfUp(14, 10)).toBe(1); // 1.4
    expect(divRoundHalfUp(16, 10)).toBe(2); // 1.6
  });
});
