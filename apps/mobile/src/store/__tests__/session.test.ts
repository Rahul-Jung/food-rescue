jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import type { Session } from '@supabase/supabase-js';

import { onSuspendedError } from '../../lib/queryClient';
import { claimsFromToken, selectBlocked, selectRole, useSessionStore } from '../session';

function token(claims: Record<string, unknown>) {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'HS256' })}.${enc(claims)}.sig`;
}
const sessionWith = (claims: Record<string, unknown>) =>
  ({ access_token: token(claims), user: { id: 'u1' } }) as unknown as Session;

describe('session store reads role and status from the JWT', () => {
  beforeEach(() => useSessionStore.setState({ session: null, role: null, status: null }));

  it('decodes app_role and app_status', () => {
    expect(claimsFromToken(token({ app_role: 'vendor', app_status: 'active' }))).toEqual({
      role: 'vendor',
      status: 'active',
    });
  });

  it('ignores unknown or missing claims', () => {
    expect(claimsFromToken(token({ app_role: 'root' }))).toEqual({ role: null, status: null });
    expect(claimsFromToken('not-a-jwt')).toEqual({ role: null, status: null });
    expect(claimsFromToken(undefined)).toEqual({ role: null, status: null });
  });

  it('setSession updates role and status; selectors read them', () => {
    useSessionStore
      .getState()
      .setSession(sessionWith({ app_role: 'vendor', app_status: 'active' }));
    const s = useSessionStore.getState();
    expect(selectRole(s)).toBe('vendor');
    expect(selectBlocked(s)).toBe(false);
  });

  it('a refreshed token with app_status suspended blocks the user', () => {
    useSessionStore
      .getState()
      .setSession(sessionWith({ app_role: 'customer', app_status: 'active' }));
    useSessionStore
      .getState()
      .setSession(sessionWith({ app_role: 'customer', app_status: 'suspended' }));
    expect(selectBlocked(useSessionStore.getState())).toBe(true);
  });

  it('an ACCOUNT_SUSPENDED answer from the server blocks the user mid-session', () => {
    useSessionStore
      .getState()
      .setSession(sessionWith({ app_role: 'customer', app_status: 'active' }));
    onSuspendedError({ message: 'OFFER_UNAVAILABLE' });
    expect(useSessionStore.getState().status).toBe('active');
    onSuspendedError({ message: 'ACCOUNT_SUSPENDED' });
    expect(useSessionStore.getState().status).toBe('suspended');
    expect(selectBlocked(useSessionStore.getState())).toBe(true);
  });

  it('signing out clears role and status', () => {
    useSessionStore
      .getState()
      .setSession(sessionWith({ app_role: 'vendor', app_status: 'active' }));
    useSessionStore.getState().setSession(null);
    expect(useSessionStore.getState()).toMatchObject({ role: null, status: null });
  });
});
