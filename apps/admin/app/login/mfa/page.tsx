'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import {
  parsePendingEnrolment,
  reusablePendingEnrolment,
  type PendingEnrolment,
} from '@food-rescue/shared';

import { Button } from '@/components/ui/button';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Mode =
  | { kind: 'loading' }
  | { kind: 'challenge'; factorId: string }
  | { kind: 'enrol'; userId: string; factorId: string; qr: string; secret: string };

/**
 * The enrolment waiting for its first code. localStorage is shared by every
 * tab, so opening the panel in a second tab does not replace the QR code
 * already scanned in the first. Cleared on verify; reused for 10 minutes.
 */
const PENDING_KEY = 'fr-mfa-pending';

function readPending(): PendingEnrolment | null {
  try {
    return parsePendingEnrolment(localStorage.getItem(PENDING_KEY));
  } catch {
    return null;
  }
}

function writePending(value: PendingEnrolment | null) {
  try {
    if (value) localStorage.setItem(PENDING_KEY, JSON.stringify(value));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked: a reload will simply show a new QR code.
  }
}

/**
 * AD-01 step 2: TOTP. First time: enrol (QR + secret), confirm the first code,
 * then show recovery codes once. Later: enter the current code (aal2).
 */
export default function MfaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: 'loading' });
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Run the set-up once (React runs effects twice in development).
  const started = useRef(false);

  /** Remove unconfirmed factors and create a new one (new QR code). */
  const startEnrolment = useCallback(async (userId: string) => {
    const supabase = supabaseBrowser();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) {
      if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: enrolError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      // Unique per enrolment (Auth requires unique factor names per user).
      friendlyName: `Admin ${new Date().toISOString()}`,
    });
    if (enrolError || !data) {
      writePending(null);
      setError('Could not start authenticator set-up. Please try again.');
      return;
    }
    setError(null);
    const pending: PendingEnrolment = {
      userId,
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
      createdAt: Math.floor(Date.now() / 1000),
    };
    writePending(pending);
    setMode({
      kind: 'enrol',
      userId,
      factorId: pending.factorId,
      qr: pending.qr,
      secret: pending.secret,
    });
  }, []);

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
        writePending(null);
        setMode({ kind: 'challenge', factorId: verified.id });
        return;
      }
      // A reload (or a second tab) shows the QR code already scanned.
      const reuse = reusablePendingEnrolment(readPending(), {
        userId: userData.user.id,
        factors: factors?.all ?? [],
        now: Math.floor(Date.now() / 1000),
      });
      if (reuse) {
        setMode({
          kind: 'enrol',
          userId: reuse.userId,
          factorId: reuse.factorId,
          qr: reuse.qr,
          secret: reuse.secret,
        });
        return;
      }
      await startEnrolment(userData.user.id);
    })();
  }, [router, startEnrolment]);

  const newQrCode = async () => {
    if (mode.kind !== 'enrol') return;
    setBusy(true);
    setCode('');
    await startEnrolment(mode.userId);
    setBusy(false);
    setNotice(
      'New QR code. Delete the old Food Rescue entry in your authenticator app, then scan this one.',
    );
  };

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
    writePending(null);
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
      {notice ? <p className="text-sm font-semibold">{notice}</p> : null}
      {error ? <p className="text-sm font-semibold">⚠ {error}</p> : null}
      <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
        {busy ? 'Checking…' : 'Verify'}
      </Button>
      {mode.kind === 'enrol' ? (
        <p className="text-center text-sm">
          <button
            type="button"
            onClick={() => void newQrCode()}
            disabled={busy}
            className="underline"
          >
            Show a new QR code
          </button>
        </p>
      ) : null}
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
