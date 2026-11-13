'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const REASONS: Record<string, string> = {
  not_admin: 'This account is not an admin account.',
  blocked: 'This account is blocked.',
  expired: 'Your session ended after 12 hours. Please log in again.',
  no_session: 'Please log in.',
};

function decodeRole(token: string): string | undefined {
  try {
    return JSON.parse(atob((token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')))
      .app_role;
  } catch {
    return undefined;
  }
}

/** AD-01 step 1: email + password. Only accounts with app_role admin continue. */
function LoginForm() {
  const router = useRouter();
  const reason = useSearchParams().get('reason');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(reason ? (REASONS[reason] ?? null) : null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = supabaseBrowser();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !data.session) {
      setBusy(false);
      setError('Wrong email or password.');
      return;
    }
    if (decodeRole(data.session.access_token) !== 'admin') {
      await supabase.auth.signOut();
      setBusy(false);
      setError('FORBIDDEN: this account is not an admin account.');
      return;
    }
    router.replace('/login/mfa');
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin login</h1>
      <p className="text-sm text-grey-700">Email and password, then your authenticator app.</p>
      <label className="block text-sm font-semibold">
        Email
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block min-h-11 w-full rounded-box border border-grey-300 px-3"
        />
      </label>
      <label className="block text-sm font-semibold">
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block min-h-11 w-full rounded-box border border-grey-300 px-3"
        />
      </label>
      {error ? <p className="text-sm font-semibold">⚠ {error}</p> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Checking…' : 'Continue'}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
