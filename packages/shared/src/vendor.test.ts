import {
  duplicateFlags,
  fromPoint,
  insidePilotArea,
  missingVendorFields,
  normaliseBusinessPhone,
  normaliseTime,
  panSchema,
  toPointEwkt,
  validDayHours,
  vendorLocationSchema,
  vendorProfileSchema,
} from './vendor';

const PILOT = {
  type: 'Polygon',
  coordinates: [
    [
      [85.25, 27.62],
      [85.4, 27.62],
      [85.4, 27.76],
      [85.25, 27.76],
      [85.25, 27.62],
    ],
  ],
};

describe('vendor fields', () => {
  it('PAN is 9 digits, Devanagari digits and spaces tolerated', () => {
    expect(panSchema.parse('601 234 567')).toBe('601234567');
    expect(panSchema.parse('६०१२३४५६७')).toBe('601234567');
    expect(panSchema.safeParse('12345').success).toBe(false);
    expect(panSchema.safeParse('ABC123456').success).toBe(false);
  });

  it('business phone accepts a mobile or a landline', () => {
    expect(normaliseBusinessPhone('9800000101')).toBe('+9779800000101');
    expect(normaliseBusinessPhone('+977 980-0000101')).toBe('+9779800000101');
    expect(normaliseBusinessPhone('01-4412345')).toBe('+97714412345');
    expect(normaliseBusinessPhone('123')).toBeNull();
  });

  it('V-02 profile needs a name, type and phone; email optional', () => {
    const ok = vendorProfileSchema.safeParse({
      name: ' Momo Ghar ',
      type: 'restaurant',
      phone: '9800000101',
    });
    expect(ok.success && ok.data).toMatchObject({
      name: 'Momo Ghar',
      phone: '+9779800000101',
      email: '',
    });
    expect(
      vendorProfileSchema.safeParse({ name: 'M', type: 'restaurant', phone: '9800000101' }).success,
    ).toBe(false);
    expect(
      vendorProfileSchema.safeParse({ name: 'Momo', type: 'pub', phone: '9800000101' }).success,
    ).toBe(false);
    expect(
      vendorProfileSchema.safeParse({ name: 'Momo', type: 'cafe', phone: '9800000101', email: 'x' })
        .success,
    ).toBe(false);
  });

  it('V-03 needs an address and a pin', () => {
    expect(
      vendorLocationSchema.safeParse({ address: 'Thamel', lat: 27.71, lng: 85.31 }).success,
    ).toBe(true);
    expect(vendorLocationSchema.safeParse({ address: 'Thamel' }).success).toBe(false);
  });
});

describe('points and the pilot area', () => {
  it('EWKT is lng first, and GeoJSON reads back', () => {
    expect(toPointEwkt(27.71, 85.31)).toBe('SRID=4326;POINT(85.31 27.71)');
    expect(fromPoint({ type: 'Point', coordinates: [85.31, 27.71] })).toEqual({
      lat: 27.71,
      lng: 85.31,
    });
    expect(fromPoint(null)).toBeNull();
  });

  it('Thamel is inside, Pokhara is outside', () => {
    expect(insidePilotArea(27.715, 85.312, PILOT)).toBe(true);
    expect(insidePilotArea(28.209, 83.985, PILOT)).toBe(false);
  });

  it('no polygon means no warning', () => {
    expect(insidePilotArea(28.2, 83.9, undefined)).toBe(true);
    expect(insidePilotArea(28.2, 83.9, { type: 'Point' })).toBe(true);
  });
});

describe('submit checks', () => {
  it('lists missing fields like the database does', () => {
    expect(missingVendorFields({ name: 'Momo', type: 'cafe', phone: ' ' })).toEqual([
      'phone',
      'address',
      'location',
      'pan_vat_no',
      'pan_doc_path',
    ]);
    expect(
      missingVendorFields({
        name: 'Momo',
        type: 'cafe',
        phone: '+9779800000101',
        address: 'Thamel',
        location: { type: 'Point', coordinates: [85.3, 27.7] },
        pan_vat_no: '601234567',
        pan_doc_path: 'pan/x/pan.webp',
      }),
    ).toEqual([]);
  });
});

describe('opening hours', () => {
  it('normalises times', () => {
    expect(normaliseTime('9:00')).toBe('09:00');
    expect(normaliseTime('2130')).toBe('21:30');
    expect(normaliseTime('२१:३०')).toBe('21:30');
    expect(normaliseTime('25:00')).toBeNull();
    expect(normaliseTime('noon')).toBeNull();
  });
  it('opens and closes must differ; past midnight is fine', () => {
    expect(validDayHours({ day_of_week: 5, opens: '18:00', closes: '02:00' })).toBe(true);
    expect(validDayHours({ day_of_week: 5, opens: '09:00', closes: '9:00' })).toBe(false);
    expect(validDayHours({ day_of_week: 7, opens: '09:00', closes: '17:00' })).toBe(false);
  });
});

describe('duplicateFlags', () => {
  it('flags vendors sharing a PAN or phone', () => {
    const flags = duplicateFlags([
      { id: 'a', pan_vat_no: '601234567', phone: '+9779800000101' },
      { id: 'b', pan_vat_no: '601 234 567', phone: '+9779800000102' },
      { id: 'c', pan_vat_no: null, phone: '+9779800000102' },
      { id: 'd', pan_vat_no: null, phone: null },
    ]);
    expect(flags.get('a')).toEqual({ pan: true, phone: false });
    expect(flags.get('b')).toEqual({ pan: true, phone: true });
    expect(flags.get('c')).toEqual({ pan: false, phone: true });
    expect(flags.get('d')).toEqual({ pan: false, phone: false });
  });
});
