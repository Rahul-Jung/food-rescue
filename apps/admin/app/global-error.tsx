'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Catches render errors anywhere in the admin and reports them to Sentry.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 32 }}>
        <h1>Something went wrong.</h1>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: 16, minHeight: 44, padding: '0 16px' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
