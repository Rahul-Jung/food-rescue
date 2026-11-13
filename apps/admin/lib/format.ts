import { formatTime, nptParts } from '@food-rescue/shared';

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-11-13" for an instant, as a Nepal calendar day. */
export function nptDate(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const p = nptParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "2026-11-13 4:05 PM" in Nepal time. */
export function nptDateTime(value: Date | string | null | undefined): string {
  if (!value) return '-';
  return `${nptDate(value)} ${formatTime(value)}`;
}
