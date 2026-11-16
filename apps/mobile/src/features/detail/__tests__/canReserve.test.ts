import { canReserve } from '../api';

jest.mock('../../../lib/supabase', () => ({ supabase: {} }));

const base = {
  offer_kind: 'surplus' as const,
  status: 'live' as const,
  expires_at: '2026-11-20T18:00:00+05:45',
  quantity_left: 3,
};
const before = new Date('2026-11-20T17:00:00+05:45').getTime();
const after = new Date('2026-11-20T18:00:01+05:45').getTime();

describe('canReserve (C-10 Reserve button)', () => {
  it('a live offer with units left can be reserved', () => {
    expect(canReserve(base, before)).toBe(true);
  });

  it('a cached copy that says live but is past its expiry cannot (T6.1 done-when)', () => {
    expect(canReserve(base, after)).toBe(false);
  });

  it('sold out or no units left cannot', () => {
    expect(canReserve({ ...base, status: 'sold_out' }, before)).toBe(false);
    expect(canReserve({ ...base, quantity_left: 0 }, before)).toBe(false);
  });

  it('expired status and happy hour deals cannot', () => {
    expect(canReserve({ ...base, status: 'expired' }, before)).toBe(false);
    expect(canReserve({ ...base, offer_kind: 'happy_hour' }, before)).toBe(false);
  });
});
