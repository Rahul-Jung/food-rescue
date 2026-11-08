export type Locale = 'en' | 'ne';
export type Digits = 'latin' | 'devanagari';

const DEVANAGARI = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/** Replace ASCII digits 0-9 with the chosen digit set. */
export function toDigits(text: string, digits: Digits): string {
  if (digits === 'latin') return text;
  return text.replace(/[0-9]/g, (d) => DEVANAGARI[Number(d)] ?? d);
}
