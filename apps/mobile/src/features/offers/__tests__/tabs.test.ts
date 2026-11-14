import { groupOffers, offerActions, offerTab, photoSlots, serverFieldToForm } from '../tabs';

describe('V-07 tabs', () => {
  it('puts each offer in one tab', () => {
    expect(offerTab({ offer_kind: 'surplus', status: 'live' })).toBe('active');
    expect(offerTab({ offer_kind: 'surplus', status: 'deactivated' })).toBe('active');
    expect(offerTab({ offer_kind: 'surplus', status: 'expired' })).toBe('past');
    expect(offerTab({ offer_kind: 'happy_hour', status: 'deactivated' })).toBe('happy');
    expect(offerTab({ offer_kind: 'surplus', status: 'deleted' })).toBeNull();
  });
  it('groups a list', () => {
    const g = groupOffers([
      { offer_kind: 'surplus', status: 'live' },
      { offer_kind: 'surplus', status: 'expired' },
      { offer_kind: 'happy_hour', status: 'live' },
    ] as const);
    expect([g.active.length, g.happy.length, g.past.length]).toEqual([1, 1, 1]);
  });
});

describe('actions', () => {
  it('live surplus: sold out, deactivate, delete, edit', () => {
    expect(offerActions({ offer_kind: 'surplus', status: 'live' })).toMatchObject({
      soldOut: true,
      deactivate: true,
      delete: true,
      edit: true,
      clone: false,
    });
  });
  it('expired surplus can only be re-activated (cloned) or deleted', () => {
    expect(offerActions({ offer_kind: 'surplus', status: 'expired' })).toMatchObject({
      clone: true,
      edit: false,
      soldOut: false,
    });
  });
  it('deals never get "sold out"', () => {
    expect(offerActions({ offer_kind: 'happy_hour', status: 'live' }).soldOut).toBe(false);
  });
});

describe('server field mapping', () => {
  it('maps constraint names to form fields', () => {
    expect(serverFieldToForm('offers_price_below_original')).toBe('price');
    expect(serverFieldToForm('pickup_extend_only')).toBe('pickup_end');
    expect(serverFieldToForm('quantity_total')).toBe('quantity_total');
    expect(serverFieldToForm(null)).toBeNull();
  });
});

describe('photo slots', () => {
  it('stored photos keep their slot; new ones fill the gaps', () => {
    expect(
      photoSlots([
        { kind: 'stored', path: 'a', position: 1 },
        { kind: 'new', uri: 'x' },
        { kind: 'new', uri: 'y' },
      ]).map((s) => s.position),
    ).toEqual([1, 0, 2]);
  });
});
