import { dealTiming, formatTime, type Digits, type Locale } from '@food-rescue/shared';
import type { TFunction } from 'i18next';

/** "Live until 7:00 PM" / "Starts at 5:00 PM" / "Starts tomorrow, 5:00 PM" / "Starts Monday, 5:00 PM". */
export function dealLabel(
  d: { live_until: string | null; next_start: string | null },
  t: TFunction,
  locale: Locale,
  digits: Digits,
  now: Date = new Date(),
): string {
  const timing = dealTiming(d, now);
  switch (timing.kind) {
    case 'live':
      return t('deal.liveUntil', { time: formatTime(timing.until, locale, digits) });
    case 'today':
      return t('deal.startsAt', { time: formatTime(timing.at, locale, digits) });
    case 'tomorrow':
      return t('deal.startsTomorrow', { time: formatTime(timing.at, locale, digits) });
    case 'later':
      return t('deal.startsOn', {
        day: t(`business.days.${timing.weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6}`),
        time: formatTime(timing.at, locale, digits),
      });
    default:
      return t('deal.noTimes');
  }
}
