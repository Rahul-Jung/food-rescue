jest.mock('../supabase', () => ({ supabase: {} }));

import { POLL_MS, quantityFromRow } from '../realtime';

describe('T5.7 live quantity', () => {
  it('is total minus reserved, never below 0', () => {
    expect(quantityFromRow({ quantity_total: 5, quantity_reserved: 2 })).toBe(3);
    expect(quantityFromRow({ quantity_total: 1, quantity_reserved: 3 })).toBe(0);
  });
  it('is null for deals (no quantity)', () => {
    expect(quantityFromRow({ quantity_total: null, quantity_reserved: 0 })).toBeNull();
    expect(quantityFromRow(null)).toBeNull();
  });
  it('polls every 15 s when Realtime is not connected', () => {
    expect(POLL_MS).toBe(15_000);
  });
});
