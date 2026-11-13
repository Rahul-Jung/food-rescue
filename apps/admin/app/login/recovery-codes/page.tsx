'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

/** Recovery codes are shown once, right after TOTP enrolment. */
export default function RecoveryCodesPage() {
  const router = useRouter();
  const [codes, setCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Read once (React runs effects twice in development; the second read would be empty).
  const read = useRef(false);

  useEffect(() => {
    if (read.current) return;
    read.current = true;
    const raw = sessionStorage.getItem('fr-recovery-codes');
    sessionStorage.removeItem('fr-recovery-codes'); // shown once only
    try {
      setCodes(raw ? JSON.parse(raw) : []);
    } catch {
      setCodes([]);
    }
  }, []);

  const text = `Food Rescue admin recovery codes\nEach code works once.\n\n${codes.join('\n')}\n`;

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'food-rescue-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!codes.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Recovery codes</h1>
        <p className="text-sm">These codes were already shown. You are logged in.</p>
        <Button onClick={() => router.replace('/')} className="w-full">
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Save your recovery codes</h1>
      <p className="text-sm text-grey-700">
        If you lose your phone, each code lets you log in once and set up a new authenticator. Keep
        them somewhere safe. They will not be shown again.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-box bg-grey-100 p-3 font-mono text-sm">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true))}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </Button>
        <Button variant="secondary" className="flex-1" onClick={download}>
          Download
        </Button>
      </div>
      <Button onClick={() => router.replace('/')} className="w-full">
        I saved them, continue
      </Button>
    </div>
  );
}
