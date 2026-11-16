import type { FoodType, SortKey } from '@food-rescue/shared';
import { create } from 'zustand';

/**
 * T5.6 filter store, shared by C-06 home, C-07 map and C-08 search. Prices are
 * paisa; pickupAfter is a wall-clock "HH:MM" (picked with TimeField, shown
 * 12-hour). radius null = the profile's radius (C-25).
 */
export type KindFilter = 'surplus' | 'happy_hour' | null;
export type VendorTypeFilter = 'bakery' | null;

export interface Filters {
  q: string;
  kind: KindFilter;
  foodType: FoodType | null;
  vendorType: VendorTypeFilter;
  priceMin: number | null;
  priceMax: number | null;
  pickupAfter: string;
  sort: SortKey;
  radius: number | null;
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  kind: null,
  foodType: null,
  vendorType: null,
  priceMin: null,
  priceMax: null,
  pickupAfter: '',
  sort: 'distance',
  radius: null,
};

/** C-06 quick chips. Under Rs. 200 = price max 20000 paisa. */
export type QuickChip = 'happyHour' | 'veg' | 'bakery' | 'under200';
export const UNDER_200_PAISA = 20000;

export function chipOn(f: Filters, chip: QuickChip): boolean {
  switch (chip) {
    case 'happyHour':
      return f.kind === 'happy_hour';
    case 'veg':
      return f.foodType === 'veg';
    case 'bakery':
      return f.vendorType === 'bakery';
    case 'under200':
      return f.priceMax === UNDER_200_PAISA && f.priceMin === null;
  }
}

export function toggleChip(f: Filters, chip: QuickChip): Partial<Filters> {
  const on = chipOn(f, chip);
  switch (chip) {
    case 'happyHour':
      return { kind: on ? null : 'happy_hour' };
    case 'veg':
      return { foodType: on ? null : 'veg' };
    case 'bakery':
      return { vendorType: on ? null : 'bakery' };
    case 'under200':
      return on ? { priceMax: null } : { priceMin: null, priceMax: UNDER_200_PAISA };
  }
}

/** Filters other than the text and sort, for "Clear filters" and the badge count. */
export function activeFilterCount(f: Filters): number {
  return [
    f.kind,
    f.foodType,
    f.vendorType,
    f.priceMin,
    f.priceMax,
    f.pickupAfter || null,
    f.radius,
  ].filter((v) => v !== null).length;
}

interface FilterState extends Filters {
  set: (patch: Partial<Filters>) => void;
  toggle: (chip: QuickChip) => void;
  clear: () => void;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  ...EMPTY_FILTERS,
  set: (patch) => set(patch),
  toggle: (chip) => set(toggleChip(get(), chip)),
  clear: () => set({ ...EMPTY_FILTERS, q: get().q }),
}));
