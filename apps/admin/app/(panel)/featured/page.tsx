import { formatPrice, nptParts } from '@food-rescue/shared';

import { Button } from '@/components/ui/button';
import { nptDateTime } from '@/lib/format';
import { hasSupabaseConfig, supabaseServer } from '@/lib/supabase';

import { addFeatured, endFeatured } from './actions';

export const dynamic = 'force-dynamic';

interface Slot {
  id: string;
  vendor_id: string;
  starts_at: string;
  ends_at: string;
  amount_paid: number;
  note: string | null;
  ended: boolean;
  vendors: { name: string } | null;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '15', '30', '45'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Today in Nepal as YYYY-MM-DD, for the date pickers' defaults. */
function nptToday(offsetDays = 0): string {
  const p = nptParts(new Date(Date.now() + offsetDays * 86_400_000));
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Date + hour / minute / AM-PM pickers (tap only, 12-hour). */
function WhenPicker({ name, label, date }: { name: string; label: string; date: string }) {
  const select = 'min-h-11 rounded-box border border-grey-300 bg-paper px-2';
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        <input type="date" name={`${name}_date`} defaultValue={date} required className={select} />
        <select
          name={`${name}_hour`}
          defaultValue="12"
          aria-label={`${label} hour`}
          className={select}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select
          name={`${name}_minute`}
          defaultValue="00"
          aria-label={`${label} minute`}
          className={select}
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          name={`${name}_ampm`}
          defaultValue="AM"
          aria-label={`${label} AM or PM`}
          className={select}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </fieldset>
  );
}

/** AD-10 Featured vendors (AD8, BR15): vendor, start, end, amount paid; ends by itself. */
export default async function FeaturedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!hasSupabaseConfig()) return <p className="text-sm">⚠ Supabase is not configured.</p>;
  const msg = (await searchParams).msg;
  const supabase = await supabaseServer();
  const [{ data: vendors }, { data: slots, error }] = await Promise.all([
    supabase.from('vendors').select('id, name, area').eq('status', 'approved').order('name'),
    supabase
      .from('featured_slots')
      .select('id, vendor_id, starts_at, ends_at, amount_paid, note, ended, vendors(name)')
      .order('ends_at', { ascending: false })
      .limit(200),
  ]);
  const now = Date.now();
  const rows = (slots ?? []) as unknown as Slot[];
  const state = (s: Slot) =>
    s.ended || new Date(s.ends_at).getTime() <= now
      ? 'Ended'
      : new Date(s.starts_at).getTime() > now
        ? 'Upcoming'
        : 'Active';

  return (
    <div className="max-w-6xl space-y-8">
      <h1 className="text-2xl font-semibold">Featured vendors</h1>
      {typeof msg === 'string' ? (
        <p role="status" className="rounded-box border border-ink px-3 py-2 text-sm">
          {msg}
        </p>
      ) : null}

      <form
        action={addFeatured}
        className="max-w-xl space-y-4 rounded-box border border-grey-300 p-4"
      >
        <h2 className="font-semibold">Add a featured slot</h2>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Vendor (approved only)</span>
          <select
            name="vendor_id"
            required
            className="min-h-11 w-full rounded-box border border-grey-300 bg-paper px-2"
          >
            <option value="">Pick a vendor</option>
            {(vendors ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.area ? ` · ${v.area}` : ''}
              </option>
            ))}
          </select>
        </label>
        <WhenPicker name="start" label="Starts (Nepal time)" date={nptToday()} />
        <WhenPicker name="end" label="Ends (Nepal time)" date={nptToday(7)} />
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Amount paid (Rs.)</span>
          <input
            name="amount"
            inputMode="numeric"
            required
            defaultValue="0"
            className="min-h-11 w-full rounded-box border border-grey-300 px-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Note (optional)</span>
          <textarea
            name="note"
            maxLength={500}
            rows={2}
            className="w-full rounded-box border border-grey-300 p-2"
          />
        </label>
        <Button type="submit">Add slot</Button>
        <p className="text-xs text-grey-700">
          Featured offers show first, only to customers within their search distance. A slot ends by
          itself at its end time.
        </p>
      </form>

      {error ? (
        <p className="text-sm">⚠ Could not read featured slots: {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-grey-700">No featured slots yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-grey-300">
              <th className="py-2">Vendor</th>
              <th className="py-2">Starts (NPT)</th>
              <th className="py-2">Ends (NPT)</th>
              <th className="py-2">Amount paid</th>
              <th className="py-2">State</th>
              <th className="py-2">Note</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const st = state(s);
              return (
                <tr key={s.id} className="border-b border-grey-100 align-top">
                  <td className="py-2 font-semibold">{s.vendors?.name ?? s.vendor_id}</td>
                  <td className="py-2">{nptDateTime(s.starts_at)}</td>
                  <td className="py-2">{nptDateTime(s.ends_at)}</td>
                  <td className="py-2">{formatPrice(s.amount_paid)}</td>
                  <td className="py-2">
                    {st === 'Active' ? `● ${st}` : st === 'Upcoming' ? `○ ${st}` : `✕ ${st}`}
                  </td>
                  <td className="py-2">{s.note ?? '-'}</td>
                  <td className="py-2">
                    {st !== 'Ended' ? (
                      <form action={endFeatured}>
                        <input type="hidden" name="slot_id" value={s.id} />
                        <Button type="submit" variant="secondary">
                          End now
                        </Button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
