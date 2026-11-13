import { duplicateFlags } from '@food-rescue/shared';
import Link from 'next/link';

import { nptDateTime } from '@/lib/format';
import { hasSupabaseConfig, supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const FILTERS = [
  { key: 'queue', label: 'Needs review' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'draft', label: 'Draft' },
  { key: 'all', label: 'All' },
] as const;

interface Row {
  id: string;
  name: string;
  type: string;
  area: string | null;
  phone: string | null;
  pan_vat_no: string | null;
  status: string;
  pending_review: boolean;
  strikes_30d: number;
  created_at: string;
  updated_at: string;
}

/** AD-03 Vendors list: filter by status, duplicate PAN or phone flag, strikes column. */
export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!hasSupabaseConfig()) return <p className="text-sm">⚠ Supabase is not configured.</p>;
  const raw = (await searchParams).status;
  const filter = FILTERS.find((f) => f.key === raw)?.key ?? 'queue';

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('vendors')
    .select(
      'id, name, type, area, phone, pan_vat_no, status, pending_review, strikes_30d, created_at, updated_at',
    )
    .order('updated_at', { ascending: false });

  const all = (data ?? []) as Row[];
  // Flags compare against every vendor, not only the filtered ones.
  const flags = duplicateFlags(all);
  const rows = all.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'queue') return r.status === 'submitted' || r.pending_review;
    return r.status === filter;
  });
  const queueCount = all.filter((r) => r.status === 'submitted' || r.pending_review).length;

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold">Vendors</h1>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/vendors?status=${f.key}`}
            aria-current={f.key === filter ? 'page' : undefined}
            className={`rounded-box border px-3 py-2 ${
              f.key === filter
                ? 'border-ink bg-ink text-paper'
                : 'border-grey-300 hover:bg-grey-100'
            }`}
          >
            {f.label}
            {f.key === 'queue' ? ` (${queueCount})` : ''}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="text-sm">⚠ Could not read vendors: {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-grey-700">No vendors here.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-grey-300">
              <th className="py-2">Name</th>
              <th className="py-2">Type</th>
              <th className="py-2">Area</th>
              <th className="py-2">Status</th>
              <th className="py-2">Flags</th>
              <th className="py-2">Strikes (30 d)</th>
              <th className="py-2">Updated (NPT)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const f = flags.get(r.id);
              const marks = [
                f?.pan ? '⚠ Duplicate PAN' : null,
                f?.phone ? '⚠ Duplicate phone' : null,
              ].filter(Boolean);
              return (
                <tr key={r.id} className="border-b border-grey-100 align-top">
                  <td className="py-2">
                    <Link href={`/vendors/${r.id}`} className="font-semibold underline">
                      {r.name || '(no name yet)'}
                    </Link>
                  </td>
                  <td className="py-2">{r.type}</td>
                  <td className="py-2">{r.area ?? '-'}</td>
                  <td className="py-2">
                    {r.status}
                    {r.pending_review ? ' · edits to review' : ''}
                  </td>
                  <td className="py-2">{marks.length ? marks.join(', ') : '-'}</td>
                  <td className="py-2">
                    {r.strikes_30d >= 3 ? `⚠ ${r.strikes_30d}` : r.strikes_30d}
                  </td>
                  <td className="py-2">{nptDateTime(r.updated_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
