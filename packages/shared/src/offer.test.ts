import {
  dealWindowLive,
  discountPercent,
  nptClock,
  paisaToRupeesInput,
  pickupTimesToday,
  rupeesToPaisa,
  validateDeal,
  validateOffer,
  windowsToForm,
  type DealForm,
  type OfferForm,
} from './offer';

// 2026-11-13 16:00 NPT (Friday) = 10:15 UTC.
const NOW = new Date('2026-11-13T10:15:00Z');

const form: OfferForm = {
  title: 'Veg momo box',
  food_type: 'veg',
  original_price: '300',
  price: '150',
  quantity_total: '5',
  pickup_start: '18:00',
  pickup_end: '20:00',
  photos: 1,
};

describe('money', () => {
  it('rupees to paisa', () => {
    expect(rupeesToPaisa('150')).toBe(15000);
    expect(rupeesToPaisa('150.5')).toBe(15050);
    expect(rupeesToPaisa('Rs 1,250')).toBe(125000);
    expect(rupeesToPaisa('१५०')).toBe(15000);
    expect(rupeesToPaisa('0')).toBeNull();
    expect(rupeesToPaisa('abc')).toBeNull();
    expect(rupeesToPaisa('1.234')).toBeNull();
    expect(paisaToRupeesInput(15050)).toBe('150.50');
    expect(paisaToRupeesInput(15000)).toBe('150');
  });
  it('discount % like the database', () => {
    expect(discountPercent(30000, 15000)).toBe(50);
    expect(discountPercent(30000, 20000)).toBe(33);
    expect(discountPercent(30000, 30000)).toBeNull();
  });
});

describe('pickup times', () => {
  it('builds today in Nepal time; expiry defaults to the end', () => {
    expect(pickupTimesToday('18:00', '20:00', undefined, NOW)).toEqual({
      pickup_start: '2026-11-13T18:00:00+05:45',
      pickup_end: '2026-11-13T20:00:00+05:45',
      expires_at: '2026-11-13T20:00:00+05:45',
    });
  });
  it('an end before the start is after midnight', () => {
    expect(pickupTimesToday('22:00', '00:30', '23:30', NOW)?.pickup_end).toBe(
      '2026-11-14T00:30:00+05:45',
    );
  });
  it('reads clock times back in Nepal time', () => {
    expect(nptClock('2026-11-13T12:15:00Z')).toBe('18:00');
  });
});

describe('validateOffer (V1)', () => {
  it('a valid offer', () => {
    const r = validateOffer(form, NOW);
    expect(r.ok && r.value).toMatchObject({
      price: 15000,
      original_price: 30000,
      quantity_total: 5,
    });
  });
  it('price must be below the original', () => {
    const r = validateOffer({ ...form, price: '300' }, NOW);
    expect(!r.ok && r.errors.price).toBe('price_below_original');
  });
  it('pickup in the past and expiry after the end', () => {
    const past = validateOffer({ ...form, pickup_start: '08:00', pickup_end: '09:00' }, NOW);
    expect(!past.ok && past.errors.pickup_end).toBe('pickup_end_future');
    const late = validateOffer({ ...form, expires_at: '21:00' }, NOW);
    expect(!late.ok && late.errors.expires_at).toBe('expires_after_end');
  });
  it('needs a name, food type, photo and quantity', () => {
    const r = validateOffer(
      { ...form, title: 'x', food_type: null, photos: 0, quantity_total: '0' },
      NOW,
    );
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual([
      'food_type',
      'photos',
      'quantity_total',
      'title',
    ]);
  });
  it('V2: quantity floor when editing', () => {
    const r = validateOffer({ ...form, quantity_total: '2' }, NOW, { minQuantity: 3 });
    expect(!r.ok && r.errors.quantity_total).toBe('quantity_floor');
  });
});

describe('deals (H1)', () => {
  const deal: DealForm = {
    title: 'Late happy hour',
    mode: 'percent',
    discount_pct: '25',
    original_price: '',
    price: '',
    days: [5, 6],
    times: [{ start: '21:00', end: '01:00' }],
    photos: 1,
  };
  it('one window per chosen day', () => {
    const r = validateDeal(deal);
    expect(r.ok && r.value.schedules).toEqual([
      { day_of_week: 5, start_time: '21:00', end_time: '01:00' },
      { day_of_week: 6, start_time: '21:00', end_time: '01:00' },
    ]);
    expect(r.ok && r.value.deal.deal_discount_pct).toBe(25);
  });
  it('refuses no days, equal times and a bad discount', () => {
    expect(validateDeal({ ...deal, days: [] }).ok).toBe(false);
    expect(validateDeal({ ...deal, times: [{ start: '21:00', end: '21:00' }] }).ok).toBe(false);
    expect(validateDeal({ ...deal, discount_pct: '95' }).ok).toBe(false);
  });
  it('deal price mode', () => {
    const r = validateDeal({ ...deal, mode: 'price', original_price: '500', price: '350' });
    expect(r.ok && r.value.deal).toMatchObject({
      original_price: 50000,
      price: 35000,
      deal_discount_pct: null,
    });
  });
  it('rows back to the editor', () => {
    expect(
      windowsToForm([
        { day_of_week: 6, start_time: '21:00:00', end_time: '01:00:00' },
        { day_of_week: 5, start_time: '21:00:00', end_time: '01:00:00' },
      ]),
    ).toEqual({ days: [5, 6], times: [{ start: '21:00', end: '01:00' }] });
  });
  it('9 pm–1 am Friday is live at 00:30 Saturday', () => {
    const w = { day_of_week: 5, start_time: '21:00', end_time: '01:00' };
    expect(dealWindowLive(w, new Date('2026-11-13T18:45:00Z'))).toBe(true); // Sat 00:30 NPT
    expect(dealWindowLive(w, new Date('2026-11-13T19:15:00Z'))).toBe(false); // Sat 01:00 NPT
    expect(dealWindowLive(w, NOW)).toBe(false); // Fri 16:00
  });
});
