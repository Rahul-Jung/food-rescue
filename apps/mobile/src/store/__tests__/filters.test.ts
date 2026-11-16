import {
  activeFilterCount,
  chipOn,
  EMPTY_FILTERS,
  toggleChip,
  UNDER_200_PAISA,
  useFilterStore,
} from '../filters';

describe('T5.6 filter store', () => {
  beforeEach(() => useFilterStore.setState({ ...EMPTY_FILTERS }));

  it('quick chips switch their filter on and off', () => {
    const s = useFilterStore.getState();
    s.toggle('happyHour');
    s.toggle('under200');
    let f = useFilterStore.getState();
    expect(f.kind).toBe('happy_hour');
    expect(f.priceMax).toBe(UNDER_200_PAISA);
    expect(chipOn(f, 'under200')).toBe(true);
    f.toggle('happyHour');
    f = useFilterStore.getState();
    expect(f.kind).toBeNull();
  });

  it('Under Rs. 200 clears a min price', () => {
    expect(toggleChip({ ...EMPTY_FILTERS, priceMin: 5000 }, 'under200')).toEqual({
      priceMin: null,
      priceMax: UNDER_200_PAISA,
    });
  });

  it('counts active filters and clear keeps the search text', () => {
    const s = useFilterStore.getState();
    s.set({ q: 'momo', foodType: 'veg', vendorType: 'bakery', pickupAfter: '17:00', radius: 3000 });
    expect(activeFilterCount(useFilterStore.getState())).toBe(4);
    useFilterStore.getState().clear();
    const f = useFilterStore.getState();
    expect(activeFilterCount(f)).toBe(0);
    expect(f.q).toBe('momo');
  });
});
