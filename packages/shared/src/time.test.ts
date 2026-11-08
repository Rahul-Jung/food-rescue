import { formatTime, formatTimeRange, nptParts } from './time';

describe('NPT times (UTC+05:45)', () => {
  it('shifts UTC to Kathmandu wall time', () => {
    expect(nptParts('2026-11-08T11:45:00Z')).toMatchObject({ hour: 17, minute: 30, day: 8 });
  });

  it('rolls over the date at NPT midnight', () => {
    // 18:15 UTC on the 8th = 00:00 NPT on the 9th
    expect(nptParts('2026-11-08T18:15:00Z')).toMatchObject({ year: 2026, month: 11, day: 9, hour: 0, minute: 0 });
    expect(nptParts('2026-11-08T18:14:00Z')).toMatchObject({ day: 8, hour: 23, minute: 59 });
  });

  it('gives weekday with 0 = Sunday in NPT', () => {
    // 2026-11-07 is a Saturday; 20:00 UTC Sat = 01:45 Sun NPT
    expect(nptParts('2026-11-07T20:00:00Z').weekday).toBe(0);
  });

  it('accepts other offsets', () => {
    expect(nptParts('2026-11-08T17:30:00+05:45')).toMatchObject({ hour: 17, minute: 30 });
  });

  it('formats in English', () => {
    expect(formatTime('2026-11-08T11:45:00Z')).toBe('5:30 PM');
    expect(formatTime('2026-11-08T18:15:00Z')).toBe('12:00 AM');
    expect(formatTime('2026-11-08T06:15:00Z')).toBe('12:00 PM');
    expect(formatTime('2026-11-08T03:20:00Z')).toBe('9:05 AM');
  });

  it('formats in Nepali with everyday day parts and optional Devanagari digits', () => {
    expect(formatTime('2026-11-08T11:45:00Z', 'ne')).toBe('साँझ 5:30'); // 17:30
    expect(formatTime('2026-11-08T03:20:00Z', 'ne', 'devanagari')).toBe('बिहान ९:०५'); // 09:05
    expect(formatTime('2026-11-08T07:15:00Z', 'ne')).toBe('दिउँसो 1:00'); // 13:00
    expect(formatTime('2026-11-08T15:15:00Z', 'ne')).toBe('राति 9:00'); // 21:00
    expect(formatTime('2026-11-08T18:15:00Z', 'ne')).toBe('राति 12:00'); // 00:00
  });

  it('formats a pickup window', () => {
    expect(formatTimeRange('2026-11-08T11:45:00Z', '2026-11-08T13:15:00Z')).toBe('5:30 PM - 7:00 PM');
  });

  it('rejects an invalid date', () => {
    expect(() => formatTime('not a date')).toThrow(RangeError);
  });
});
