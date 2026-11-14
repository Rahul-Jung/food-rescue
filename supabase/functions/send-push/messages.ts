// Notification texts for send-push (T3.7), by title_key / body_key, in the
// receiver's profiles.locale (plan section 9). Pure, so it is unit tested.
// {name} placeholders are filled from notifications.data.

export type Locale = 'en' | 'ne';

const TEXTS: Record<Locale, Record<string, string>> = {
  en: {
    'notif.vendor_approved.title': 'Your business is approved',
    'notif.vendor_approved.body': 'You can now post food offers on Food Rescue.',
    'notif.vendor_rejected.title': 'Your application needs changes',
    'notif.vendor_rejected.body': 'Reason: {reason}. Open the app to edit and resubmit.',
  },
  ne: {
    'notif.vendor_approved.title': 'तपाईंको व्यवसाय स्वीकृत भयो',
    'notif.vendor_approved.body': 'अब तपाईं फुड रेस्क्युमा खानाका अफरहरू राख्न सक्नुहुन्छ।',
    'notif.vendor_rejected.title': 'तपाईंको आवेदनमा सुधार चाहिन्छ',
    'notif.vendor_rejected.body': 'कारण: {reason}। एप खोलेर सच्याई फेरि पठाउनुहोस्।',
  },
};

/** Email is sent only for these types (section 9: Push + email). */
export const EMAIL_TYPES = new Set(['vendor_approved', 'vendor_rejected']);

export function toLocale(value: unknown): Locale {
  return value === 'ne' ? 'ne' : 'en';
}

function fill(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = data[k];
    return v === undefined || v === null ? '' : String(v);
  });
}

/** Text for a key in the locale; falls back to English, then to the key itself. */
export function text(locale: Locale, key: string, data: Record<string, unknown> = {}): string {
  const template = TEXTS[locale][key] ?? TEXTS.en[key] ?? key;
  return fill(template, data);
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title_key: string;
  body_key: string;
  data: Record<string, unknown> | null;
}

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data: Record<string, unknown>;
  channelId: 'default';
}

export function buildPushMessages(
  n: NotificationRow,
  locale: Locale,
  tokens: string[],
): ExpoMessage[] {
  const data = n.data ?? {};
  const title = text(locale, n.title_key, data);
  const body = text(locale, n.body_key, data);
  return tokens.map((to) => ({
    to,
    title,
    body,
    sound: 'default',
    data: { ...data, type: n.type, notification_id: n.id },
    channelId: 'default',
  }));
}

export interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/** Tokens Expo says are no longer valid; send-push deletes them. */
export function deadTokens(messages: ExpoMessage[], tickets: ExpoTicket[]): string[] {
  const dead: string[] = [];
  tickets.forEach((t, i) => {
    if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' && messages[i]) {
      dead.push(messages[i].to);
    }
  });
  return dead;
}

export function buildEmail(n: NotificationRow, locale: Locale) {
  const data = n.data ?? {};
  const subject = text(locale, n.title_key, data);
  const body = text(locale, n.body_key, data);
  const escaped = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return { subject, text: body, html: `<p>${escaped}</p>` };
}
