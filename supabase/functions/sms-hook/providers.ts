// SMS gateways behind one interface, so the open question (Sparrow SMS or
// Aakash SMS, plan section 14) can be settled without touching the hook.
import { maskPhone } from './message.ts';

export interface SmsProvider {
  name: string;
  send(to: string, text: string): Promise<void>;
}

/** Local development only: prints the SMS to the function logs. */
export const consoleProvider: SmsProvider = {
  name: 'console',
  send(to, text) {
    console.log(`[sms-hook] SMS to ${maskPhone(to)}: ${text}`);
    return Promise.resolve();
  },
};

function notSetUp(name: string): SmsProvider {
  return {
    name,
    send() {
      return Promise.reject(
        new Error(`SMS provider "${name}" is not set up yet: pick the gateway and add its adapter`),
      );
    },
  };
}

/**
 * SMS_PROVIDER picks the gateway. Unset means console, which is allowed only
 * against a local stack, so a deployed function can never silently print OTPs.
 */
export function getProvider(env: { get(key: string): string | undefined }): SmsProvider {
  const name = (env.get('SMS_PROVIDER') ?? '').trim().toLowerCase();
  const supabaseUrl = env.get('SUPABASE_URL') ?? '';
  const isLocal = /kong|127\.0\.0\.1|localhost|host\.docker\.internal/.test(supabaseUrl);

  if (name === '' || name === 'console') {
    if (!isLocal) throw new Error('SMS_PROVIDER must be set outside local development');
    return consoleProvider;
  }
  if (name === 'sparrow' || name === 'aakash') return notSetUp(name);
  throw new Error(`Unknown SMS_PROVIDER "${name}"`);
}
