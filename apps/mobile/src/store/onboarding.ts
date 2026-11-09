import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStringStorage } from '../lib/storage';

export interface PilotArea {
  name: string;
  name_ne?: string;
  lat: number;
  lng: number;
}

interface OnboardingState {
  /** C-01 done (first launch only). */
  languageChosen: boolean;
  /** C-02 done (shown once). */
  introSeen: boolean;
  /** C-05 done: the user shared location or picked an area. */
  locationDone: boolean;
  /** Area picked in C-05 when location is denied; kept on this device only. */
  area: PilotArea | null;
  setLanguageChosen: () => void;
  setIntroSeen: () => void;
  setArea: (area: PilotArea | null) => void;
  setLocationDone: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      languageChosen: false,
      introSeen: false,
      locationDone: false,
      area: null,
      setLanguageChosen: () => set({ languageChosen: true }),
      setIntroSeen: () => set({ introSeen: true }),
      setArea: (area) => set({ area }),
      setLocationDone: () => set({ locationDone: true }),
    }),
    { name: 'onboarding', storage: createJSONStorage(() => appStringStorage) },
  ),
);
