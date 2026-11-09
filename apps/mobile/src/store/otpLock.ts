import { OTP_LOCK_EMPTY, registerWrongOtp, type OtpLockState } from '@food-rescue/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStringStorage } from '../lib/storage';

interface OtpLockStoreState {
  /** Wrong-code count and lock, per phone number or email. Survives restarts. */
  locks: Record<string, OtpLockState>;
  /** When the last code was sent, per phone number or email (epoch ms). */
  lastSent: Record<string, number>;
  lockFor: (id: string) => OtpLockState;
  registerWrong: (id: string, now?: number) => OtpLockState;
  clear: (id: string) => void;
  markSent: (id: string, now?: number) => void;
}

export const useOtpLockStore = create<OtpLockStoreState>()(
  persist(
    (set, get) => ({
      locks: {},
      lastSent: {},
      lockFor: (id) => get().locks[id] ?? OTP_LOCK_EMPTY,
      registerWrong: (id, now = Date.now()) => {
        const next = registerWrongOtp(get().lockFor(id), now);
        set((s) => ({ locks: { ...s.locks, [id]: next } }));
        return next;
      },
      clear: (id) =>
        set((s) => {
          const locks = { ...s.locks };
          delete locks[id];
          return { locks };
        }),
      markSent: (id, now = Date.now()) => set((s) => ({ lastSent: { ...s.lastSent, [id]: now } })),
    }),
    { name: 'otp-lock', storage: createJSONStorage(() => appStringStorage) },
  ),
);
