import { toDigits, type Digits, type Locale } from './digits';

const PREFIX: Record<Locale, string> = { en: 'Rs.', ne: 'रू.' };

/** Round half up for a non-negative numerator / positive denominator, in integers. */
export function divRoundHalfUp(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new RangeError('divRoundHalfUp needs safe integers and a positive denominator');
  }
  const sign = numerator < 0 ? -1 : 1;
  const n = Math.abs(numerator);
  return sign * Math.floor((2 * n + denominator) / (2 * denominator));
}

/** South Asian grouping: 1,25,000. */
function groupRupees(rupees: number): string {
  const s = String(rupees);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

/**
 * Format integer paisa as a price: "Rs. 250", "Rs. 1,250.50", "रू. २५०".
 * Paisa are shown only when non-zero. Latin digits by default.
 */
export function formatPrice(
  paisa: number,
  locale: Locale = 'en',
  digits: Digits = 'latin',
): string {
  if (!Number.isSafeInteger(paisa)) throw new RangeError('paisa must be an integer');
  const sign = paisa < 0 ? '-' : '';
  const abs = Math.abs(paisa);
  const rupees = Math.floor(abs / 100);
  const rest = abs % 100;
  const body = groupRupees(rupees) + (rest ? `.${String(rest).padStart(2, '0')}` : '');
  return `${sign}${PREFIX[locale]} ${toDigits(body, digits)}`;
}
