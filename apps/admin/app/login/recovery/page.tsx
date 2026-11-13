'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

/**
 * Lost authenticator: after email + password, one recovery code removes the
 * old authenticator (admin_redeem_recovery_code) and sends you to set up a new one.
 */
export default function RecoveryPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = supabaseBrowser();
    const { data, error: rpcError } = await supabase.rpc('admin_redeem_recovery_code', {
      p_code: code,
    });
    setBusy(false);
    if (rpcError) {
      setError('Please log in with your email and password first.');
      return;
    }
    if (data !== true) {
      setError('That recovery code is not valid or was already used.');
      return;
    }
    router.replace('/login/mfa');
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-2xl font-semibold">Use a recovery code</h1>
      <p className="text-sm text-grey-700">
        Each code works once. Your old authenticator will be removed and you will set up a new one.
      </p>
      <input
        required
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABCDE-FGH23"
        aria-label="Recovery code"
        className="block min-h-11 w-full rounded-box border border-grey-300 px-3 text-center font-mono tracking-widest"
      />
      {error ? <p className="text-sm font-semibold">⚠ {error}</p> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Checking…' : 'Use code'}
      </Button>
    </form>
  );
}
