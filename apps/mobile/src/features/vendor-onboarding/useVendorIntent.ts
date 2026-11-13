import { useEffect, useRef, useState } from 'react';

import { supabase } from '../../lib/supabase';
import { useSessionStore } from '../../store/session';
import { useVendorIntentStore } from '../../store/vendorIntent';
import { startVendorSignup } from './api';

/**
 * T3.3: after a V-01 sign-in, turn the account into a vendor account
 * (start_vendor_signup), then refresh the token so the new role reaches the
 * route gate. Returns true while that is happening, so the gate waits
 * instead of sending the user to the customer location step.
 */
export function useVendorIntent(): { pending: boolean; failed: boolean; clear: () => void } {
  const wantsVendor = useVendorIntentStore((s) => s.wantsVendor);
  const setWantsVendor = useVendorIntentStore((s) => s.setWantsVendor);
  const signedIn = useSessionStore((s) => s.session !== null);
  const role = useSessionStore((s) => s.role);
  const status = useSessionStore((s) => s.status);
  const [failed, setFailed] = useState(false);
  const running = useRef(false);

  const needed = wantsVendor && signedIn && status === 'active' && role !== 'vendor';

  useEffect(() => {
    if (wantsVendor && signedIn && (role === 'vendor' || role === 'admin')) {
      setWantsVendor(false);
      return;
    }
    if (!needed || running.current || failed) return;
    running.current = true;
    (async () => {
      try {
        await startVendorSignup();
        await supabase.auth.refreshSession();
        setWantsVendor(false);
      } catch {
        setFailed(true);
      } finally {
        running.current = false;
      }
    })();
  }, [needed, failed, wantsVendor, signedIn, role, setWantsVendor]);

  return {
    pending: needed && !failed,
    failed,
    clear: () => {
      setFailed(false);
      setWantsVendor(false);
    },
  };
}
