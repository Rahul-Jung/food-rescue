import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStringStorage } from '../lib/storage';

/**
 * V-01: the user chose "I run a business" before signing in. Kept across the
 * OTP step (and an app restart); after sign-in the app calls
 * start_vendor_signup once and clears it.
 */
interface VendorIntentState {
  wantsVendor: boolean;
  setWantsVendor: (on: boolean) => void;
}

export const useVendorIntentStore = create<VendorIntentState>()(
  persist(
    (set) => ({
      wantsVendor: false,
      setWantsVendor: (wantsVendor) => set({ wantsVendor }),
    }),
    { name: 'vendor-intent', storage: createJSONStorage(() => appStringStorage) },
  ),
);
