import type { FoodType } from '@food-rescue/shared';
import { create } from 'zustand';

/** V-08 -> V-09: the new offer being filled in (two steps, one offer). */
export interface OfferDraft {
  photos: string[]; // local image URIs, up to 3
  title: string;
  title_ne: string;
  food_type: FoodType | null;
  ingredients: string;
  weight_g: string;
  original_price: string;
  price: string;
  quantity_total: string;
  pickup_start: string;
  pickup_end: string;
  expires_at: string;
}

const EMPTY: OfferDraft = {
  photos: [],
  title: '',
  title_ne: '',
  food_type: null,
  ingredients: '',
  weight_g: '',
  original_price: '',
  price: '',
  quantity_total: '1',
  pickup_start: '18:00',
  pickup_end: '20:00',
  expires_at: '',
};

interface OfferDraftState {
  draft: OfferDraft;
  set: (patch: Partial<OfferDraft>) => void;
  reset: () => void;
}

export const useOfferDraftStore = create<OfferDraftState>((set) => ({
  draft: EMPTY,
  set: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  reset: () => set({ draft: EMPTY }),
}));
