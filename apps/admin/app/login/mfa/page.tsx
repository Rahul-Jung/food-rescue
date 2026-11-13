'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Mode =
  | { kind: 'loading' }
  | { kind: 'challenge'; factorId: string }
  | { kind: 'enrol'; factorId: string; qr: string; secret: string };

/**
 * AD-01 step 2: TOTP. First time: enrol (QR + secret), confirm the first code,
 * then show recovery codes once. Later: enter the current code (aal2).
 */
export default function MfaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: 'loading' });
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Run the set-up once (React runs effects twice in development).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const supabase = supabaseBrowser();
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace('/login');
        return;
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === 'aal2') {
        router.replace('/');
        return;
      }
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp.find((f) => f.status === 'verified');
      if (verified) {
        setMode({ kind: 'challenge', factorId: verified.id });
        return;
      }
      // Remove half-finished enrolments, then start a new one.
      for (const f of factors?.all ?? []) {
        if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: enrolError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        // Unique per enrolment (Auth requires unique factor names per user).
        friendlyName: `Admin ${new Date().toISOString()}`,
      });
      if (enrolError || !data) {
        setError('Could not start authenticator set-up. Please try again.');
        return;
      }
      setError(null);
      setMode({
        kind: 'enrol',
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    })();
  }, [router]);

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (mode.kind === 'loading') return;
    setError(null);
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mode.factorId,
      code: code.trim(),
    });
    if (verifyError) {
      setBusy(false);
      setCode('');
      setError('That code is not correct. Use the current 6-digit code from your app.');
      return;
    }
    // aal2 now: write the audit_log row on the server (IP + user agent).
    await fetch('/login/audit', { method: 'POST' });
    if (mode.kind === 'enrol') {
      const { data: codes } = await supabase.rpc('admin_generate_recovery_codes');
      sessionStorage.setItem('fr-recovery-codes', JSON.stringify(codes ?? []));
      router.replace('/login/recovery-codes');
    } else {
      router.replace('/');
    }
  };

  if (mode.kind === 'loading') {
    return <p className="text-sm">{error ?? 'Loading…'}</p>;
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <h1 className="text-2xl font-semibold">
        {mode.kind === 'enrol' ? 'Set up your authenticator' : 'Enter your code'}
      </h1>
      {mode.kind === 'enrol' ? (
        <>
          <p className="text-sm text-grey-700">
            Admins must use two-factor login. Scan this QR code with an authenticator app (for
            example Google Authenticator), then type the 6-digit code it shows.
          </p>
          <img
            src={mode.qr}
            alt="QR code for the authenticator app"
            className="mx-auto h-48 w-48"
          />
          <p className="text-xs break-all text-grey-700">
            Can&apos;t scan? Enter this key: <span className="font-mono">{mode.secret}</span>
          </p>
        </>
      ) : (
        <p className="text-sm text-grey-700">
          Open your authenticator app and type the 6-digit code.
        </p>
      )}
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        aria-label="6-digit code"
        className="block min-h-11 w-full rounded-box border border-grey-300 px-3 text-center font-mono text-xl tracking-[0.4em]"
      />
      {error ? <p className="text-sm font-semibold">⚠ {error}</p> : null}
      <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
        {busy ? 'Checking…' : 'Verify'}
      </Button>
      {mode.kind === 'challenge' ? (
        <p className="text-center text-sm">
          <Link href="/login/recovery" className="underline">
            Lost your authenticator? Use a recovery code
          </Link>
        </p>
      ) : null}
    </form>
  );
}
