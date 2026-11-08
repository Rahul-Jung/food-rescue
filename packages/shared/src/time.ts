import { toDigits, type Digits, type Locale } from './digits';

export const NPT_TIME_ZONE = 'Asia/Kathmandu';
/** Nepal is UTC+05:45 all year (no DST), so a fixed offset avoids relying on Intl time zones in Hermes. */
export const NPT_OFFSET_MINUTES = 5 * 60 + 45;

export interface NptParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  weekday: number; // 0 = Sunday, same as vendor_hours.day_of_week
}

function toDate(value: Date | string): Date {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) throw new RangeError('invalid date');
  return d;
}

/** Wall-clock parts in Nepal for an instant. */
export function nptParts(value: Date | string): NptParts {
  const shifted = new Date(toDate(value).getTime() + NPT_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

const MERIDIEM: Record<Locale, [string, string]> = {
  en: ['AM', 'PM'],
  ne: ['पूर्वाह्न', 'अपराह्न'],
};

/** "5:30 PM" / "५:३० अपराह्न", always in Asia/Kathmandu. */
export function formatTime(value: Date | string, locale: Locale = 'en', digits: Digits = 'latin'): string {
  const { hour, minute } = nptParts(value);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const clock = toDigits(`${h12}:${String(minute).padStart(2, '0')}`, digits);
  const [am, pm] = MERIDIEM[locale];
  return `${clock} ${hour < 12 ? am : pm}`;
}

/** "5:30 PM - 7:00 PM" for a pickup window. */
export function formatTimeRange(
  start: Date | string,
  end: Date | string,
  locale: Locale = 'en',
  digits: Digits = 'latin',
): string {
  return `${formatTime(start, locale, digits)} - ${formatTime(end, locale, digits)}`;
}
