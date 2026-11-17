import { dealTiming } from './dealTime';

// 2026-11-20 is a Friday. Times are Nepal time (+05:45).
const at = (s: string) => new Date(s);

describe('dealTiming', () => {
  it('live until the window end', () => {
    expect(
      dealTiming(
        { live_until: '2026-11-21T01:00:00+05:45', next_start: '2026-11-27T21:00:00+05:45' },
        at('2026-11-21T00:30:00+05:45'),
      ),
    ).toEqual({ kind: 'live', until: '2026-11-21T01:00:00+05:45' });
  });

  it('a window that already ended counts as not live', () => {
    expect(
      dealTiming(
        { live_until: '2026-11-20T19:00:00+05:45', next_start: '2026-11-21T17:00:00+05:45' },
        at('2026-11-20T19:01:00+05:45'),
      ).kind,
    ).toBe('tomorrow');
  });

  it('starts later today', () => {
    expect(
      dealTiming(
        { live_until: null, next_start: '2026-11-20T17:00:00+05:45' },
        at('2026-11-20T10:00:00+05:45'),
      ),
    ).toEqual({ kind: 'today', at: '2026-11-20T17:00:00+05:45' });
  });

  it('starts tomorrow by the Nepal calendar, not UTC', () => {
    // 11:30 PM Friday in Nepal is still Friday; 5 PM Saturday is "tomorrow".
    expect(
      dealTiming(
        { live_until: null, next_start: '2026-11-21T17:00:00+05:45' },
        at('2026-11-20T23:30:00+05:45'),
      ).kind,
    ).toBe('tomorrow');
  });

  it('a later day gives its weekday', () => {
    expect(
      dealTiming(
        { live_until: null, next_start: '2026-11-23T17:00:00+05:45' },
        at('2026-11-20T10:00:00+05:45'),
      ),
    ).toEqual({ kind: 'later', at: '2026-11-23T17:00:00+05:45', weekday: 1 });
  });

  it('no windows', () => {
    expect(dealTiming({ live_until: null, next_start: null })).toEqual({ kind: 'none' });
  });
});
