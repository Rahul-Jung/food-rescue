import { MutationObserver, QueryClient } from '@tanstack/react-query';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import type { MyProfile } from '../api';
import { myProfileKey, profileMutationOptions } from '../hooks';

const USER = 'u1';
const base: MyProfile = {
  id: USER,
  full_name: 'Sita',
  phone: '+9779812345678',
  email: null,
  locale: 'en',
  radius_m: 2000,
  pickup_reminders: true,
  marketing_pushes: false,
  devanagari_digits: false,
};

function setup(save: (p: Partial<MyProfile>) => Promise<MyProfile>) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  qc.setQueryData(myProfileKey(USER), base);
  const observer = new MutationObserver(qc, profileMutationOptions(qc, USER, save));
  return { qc, observer };
}

describe('settings mutations: edits show at once', () => {
  it('shows the change before the server answers, then keeps the saved row', async () => {
    let resolve!: (p: MyProfile) => void;
    const { qc, observer } = setup(() => new Promise<MyProfile>((r) => (resolve = r)));
    const done = observer.mutate({ full_name: 'सीता शर्मा', radius_m: 3000 });
    // let onMutate (which awaits cancelQueries) run
    await new Promise((r) => setTimeout(r, 0));
    expect(qc.getQueryData<MyProfile>(myProfileKey(USER))).toMatchObject({
      full_name: 'सीता शर्मा',
      radius_m: 3000,
    });
    resolve({ ...base, full_name: 'सीता शर्मा', radius_m: 3000 });
    await done;
    expect(qc.getQueryData<MyProfile>(myProfileKey(USER))?.full_name).toBe('सीता शर्मा');
  });

  it('rolls back when the save fails', async () => {
    const { qc, observer } = setup(() => Promise.reject(new Error('VALIDATION_FAILED')));
    await expect(observer.mutate({ marketing_pushes: true, locale: 'ne' })).rejects.toThrow();
    expect(qc.getQueryData<MyProfile>(myProfileKey(USER))).toEqual(base);
  });

  it('toggles save independently', async () => {
    const save = jest.fn(async (p: Partial<MyProfile>) => ({ ...base, ...p }));
    const { qc, observer } = setup(save);
    await observer.mutate({ devanagari_digits: true });
    expect(save.mock.calls[0]?.[0]).toEqual({ devanagari_digits: true });
    expect(qc.getQueryData<MyProfile>(myProfileKey(USER))?.devanagari_digits).toBe(true);
  });
});
