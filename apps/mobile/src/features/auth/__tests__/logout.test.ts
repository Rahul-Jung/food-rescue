import { QueryClient } from '@tanstack/react-query';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('../../../lib/analytics', () => ({ posthog: null }));

import { appStringStorage } from '../../../lib/storage';
import { useLanguageStore } from '../../../store/language';
import { useLocationStore } from '../../../store/location';
import { useOnboardingStore } from '../../../store/onboarding';
import { useOtpLockStore } from '../../../store/otpLock';
import { useSessionStore } from '../../../store/session';
import { logout } from '../logout';

describe('logout clears the user data and keeps device settings', () => {
  it('signs out, empties the cache and resets user stores', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['app_settings_public'], { maintenance: false });
    appStringStorage.setItem('query-cache', '{"clientState":{}}');

    useLanguageStore.getState().setLocale('ne');
    useOnboardingStore.setState({ languageChosen: true, introSeen: true, locationDone: true });
    useOnboardingStore.getState().setArea({ name: 'Patan', lat: 27.67, lng: 85.32 });
    useLocationStore.getState().setPoint({ lat: 27.67, lng: 85.32, source: 'area' });
    useOtpLockStore.getState().registerWrong('+9779812345678');
    useSessionStore.getState().setPasswordRecovery(true);

    const signOut = jest.fn(async () => ({ error: null }));
    const resetAnalytics = jest.fn();
    await logout({
      signOut,
      queryClient,
      removePersisted: (k) => appStringStorage.removeItem(k),
      resetAnalytics,
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    // cache gone, in memory and on disk
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(appStringStorage.getItem('query-cache')).toBeNull();
    // user stores reset
    expect(useLocationStore.getState().point).toBeNull();
    expect(useOnboardingStore.getState().locationDone).toBe(false);
    expect(useOnboardingStore.getState().area).toBeNull();
    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().passwordRecovery).toBe(false);
    expect(resetAnalytics).toHaveBeenCalled();
    // device settings kept
    expect(useLanguageStore.getState().locale).toBe('ne');
    expect(useOnboardingStore.getState().languageChosen).toBe(true);
    expect(useOnboardingStore.getState().introSeen).toBe(true);
    expect(useOtpLockStore.getState().lockFor('+9779812345678').wrong).toBe(1);
  });

  it('still clears local data when sign-out fails (e.g. offline)', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['x'], 1);
    await expect(
      logout({
        signOut: () => Promise.reject(new Error('offline')),
        queryClient,
        removePersisted: (k) => appStringStorage.removeItem(k),
        resetAnalytics: jest.fn(),
      }),
    ).rejects.toThrow('offline');
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
