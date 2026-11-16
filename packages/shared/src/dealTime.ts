import { nptParts } from './time';

/**
 * C-12 deal timing (H1): "Live until 7:00 PM" while a window is open,
 * otherwise when it next starts: today ("Starts at 5:00 PM"), tomorrow
 * ("Starts tomorrow"), or a later weekday. Days are Nepal calendar days.
 */
export type DealTiming =
  | { kind: 'live'; until: string }
  | { kind: 'today'; at: string }
  | { kind: 'tomorrow'; at: string }
  | { kind: 'later'; at: string; weekday: number }
  | { kind: 'none' };

function dayNumber(value: Date | string): number {
  const p = nptParts(value);
  return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / 86_400_000);
}

export function dealTiming(
  d: { live_until: string | null; next_start: string | null },
  now: Date = new Date(),
): DealTiming {
  if (d.live_until && new Date(d.live_until).getTime() > now.getTime()) {
    return { kind: 'live', until: d.live_until };
  }
  if (!d.next_start) return { kind: 'none' };
  const diff = dayNumber(d.next_start) - dayNumber(now);
  if (diff <= 0) return { kind: 'today', at: d.next_start };
  if (diff === 1) return { kind: 'tomorrow', at: d.next_start };
  return { kind: 'later', at: d.next_start, weekday: nptParts(d.next_start).weekday };
}
