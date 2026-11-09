import { create } from 'zustand';

/**
 * The point used for "nearby" searches. GPS points stay in memory only and
 * are sent per search, never stored (plan section 9 / N7). A picked area is
 * also kept on the device by the onboarding store.
 */
export interface SearchPoint {
  lat: number;
  lng: number;
  source: 'gps' | 'area';
  areaName?: string;
}

interface LocationState {
  point: SearchPoint | null;
  setPoint: (point: SearchPoint | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  point: null,
  setPoint: (point) => set({ point }),
}));
