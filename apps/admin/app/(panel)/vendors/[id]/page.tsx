import { duplicateFlags } from '@food-rescue/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { nptDate, nptDateTime } from '@/lib/format';
import { hasSupabaseConfig, supabaseServer } from '@/lib/supabase';

import { approveVendor, rejectVendor, setCommission, suspendOwner } from '../actions';

export const dynamic = 'force-dynamic';

interface Vendor {
  id: string;
  owner_id: string;
  name: string;
  type: string;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  landmark: string | null;
  area: string | null;
  lat: number | null;
  lng: number | null;
  pan_vat_no: string | null;
  pan_doc_path: string | null;
  status: string;
  reject_reason: string | null;
  pending_review: boolean;
  commission_rate_bp: number;
  commission_free_until: string | null;
  strikes_30d: number;
  approved_at: string | null;
  created_at: string;
}

const SIGNED_URL_SECONDS = 5 * 60;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2 border-b border-grey-100 py-2 text-sm">
      <dt className="text-grey-700">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

/**
 * AD-04 Vendor detail: profile, pin on a map, PAN document through a
 * 5-minute signed URL, duplicate PAN / phone flag; approve, reject with a
 * reason, suspend, commission rate and free-until date. Every action goes
 * through an admin_* RPC that writes audit_log.
 */
export default async function VendorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!hasSupabaseConfig()) return <p className="text-sm">⚠ Supabase is not configured.</p>;
  const { id } = await params;
  const msg = (await searchParams).msg;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await supabaseServer();
  const { data: v } = await supabase
    .from('vendors')
    .select(
      'id, owner_id, name, type, description, logo_url, phone, email, address, landmark, area, lat, lng, pan_vat_no, pan_doc_path, status, reject_reason, pending_review, commission_rate_bp, commission_free_until, strikes_30d, approved_at, created_at',
    )
    .eq('id', id)
    .maybeSingle<Vendor>();
  if (!v) notFound();

  const [owner, others, audit, panUrl] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, phone, email, status, role')
      .eq('id', v.owner_id)
      .maybeSingle<{
        full_name: string | null;
        phone: string | null;
        email: string | null;
        status: string;
        role: string;
      }>(),
    supabase.from('vendors').select('id, name, pan_vat_no, phone'),
    supabase
      .from('audit_log')
      .select('id, action, actor_id, after, at')
      .eq('entity_id', v.id)
      .order('at', { ascending: false })
      .limit(20),
    v.pan_doc_path
      ? supabase.storage.from('private-docs').createSignedUrl(v.pan_doc_path, SIGNED_URL_SECONDS)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const all = (others.data ?? []) as {
    id: string;
    name: string;
    pan_vat_no: string | null;
    phone: string | null;
  }[];
  const flag = duplicateFlags(all).get(v.id);
  const twins = all.filter(
    (o) =>
      o.id !== v.id &&
      ((flag?.pan && o.pan_vat_no === v.pan_vat_no) || (flag?.phone && o.phone === v.phone)),
  );

  const canApprove =
    v.status === 'submitted' ||
    v.status === 'suspended' ||
    (v.status === 'approved' && v.pending_review);
  const canReject = v.status === 'submitted';
  const canSuspend = v.status !== 'suspended' && owner.data?.role !== 'admin';
  const hasPin = typeof v.lat === 'number' && typeof v.lng === 'number';
  const d = 0.004;
  const mapSrc = hasPin
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${v.lng! - d},${v.lat! - d},${v.lng! + d},${v.lat! + d}&layer=mapnik&marker=${v.lat},${v.lng}`
    : null;
  const percent = (v.commission_rate_bp / 100).toString();

  return (
    <div className="max-w-5xl space-y-8">
      <div className="space-y-1">
        <Link href="/vendors" className="text-sm underline">
          ← Vendors
        </Link>
        <h1 className="text-2xl font-semibold">{v.name || '(no name yet)'}</h1>
        <p className="text-sm text-grey-700">
          Status: <span className="font-semibold">{v.status}</span>
          {v.pending_review ? ' · name, PAN or pin edited since approval: review again' : ''}
        </p>
      </div>

      {typeof msg === 'string' && msg ? (
        <p role="status" className="rounded-box border border-ink p-3 text-sm">
          {msg}
        </p>
      ) : null}

      {flag?.pan || flag?.phone ? (
        <div className="rounded-box border-2 border-ink p-3 text-sm">
          <p className="font-semibold">
            ⚠ {flag.pan ? 'Duplicate PAN' : ''}
            {flag.pan && flag.phone ? ' and ' : ''}
            {flag.phone ? 'duplicate phone' : ''}
          </p>
          <ul className="mt-1 list-disc pl-5">
            {twins.map((o) => (
              <li key={o.id}>
                <Link href={`/vendors/${o.id}`} className="underline">
                  {o.name || o.id}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-lg font-semibold">Profile</h2>
          <dl>
            <Field label="Type">{v.type}</Field>
            <Field label="Description">{v.description || '-'}</Field>
            <Field label="Business phone">{v.phone || '-'}</Field>
            <Field label="Business email">{v.email || '-'}</Field>
            <Field label="Address">{v.address || '-'}</Field>
            <Field label="Landmark">{v.landmark || '-'}</Field>
            <Field label="Owner">
              {owner.data?.full_name || '-'} · {owner.data?.phone || owner.data?.email || '-'} ·{' '}
              {owner.data?.status ?? '-'}
            </Field>
            <Field label="PAN / VAT">{v.pan_vat_no || '-'}</Field>
            <Field label="Strikes (30 d)">{v.strikes_30d}</Field>
            <Field label="Created">{nptDateTime(v.created_at)}</Field>
            <Field label="Approved">{nptDateTime(v.approved_at)}</Field>
            {v.reject_reason ? <Field label="Reject reason">{v.reject_reason}</Field> : null}
          </dl>
          {v.logo_url ? (
            <img
              src={v.logo_url}
              alt="Logo"
              className="mt-4 h-20 w-20 rounded-box border border-grey-300"
            />
          ) : null}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Pin</h2>
          {mapSrc ? (
            <>
              <iframe
                title="Vendor pin on the map"
                src={mapSrc}
                className="h-64 w-full rounded-box border border-grey-300"
                loading="lazy"
              />
              <p className="text-sm">
                {v.lat?.toFixed(5)}, {v.lng?.toFixed(5)} ·{' '}
                <a
                  className="underline"
                  href={`https://www.google.com/maps?q=${v.lat},${v.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Google Maps
                </a>
              </p>
            </>
          ) : (
            <p className="text-sm text-grey-700">No pin yet.</p>
          )}

          <h2 className="text-lg font-semibold">PAN document</h2>
          {panUrl.data?.signedUrl ? (
            <p className="text-sm">
              <a
                className="underline"
                href={panUrl.data.signedUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open PAN document
              </a>{' '}
              (link works for 5 minutes; reload the page for a new one)
            </p>
          ) : (
            <p className="text-sm text-grey-700">
              {v.pan_doc_path ? '⚠ Could not make a link to the document.' : 'Not uploaded yet.'}
            </p>
          )}
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Decision</h2>
        <div className="flex flex-wrap items-start gap-6">
          <form action={approveVendor}>
            <input type="hidden" name="id" value={v.id} />
            <Button type="submit" disabled={!canApprove}>
              {v.pending_review ? 'Approve changes' : 'Approve'}
            </Button>
          </form>

          <form action={rejectVendor} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={v.id} />
            <label className="text-sm" htmlFor="reject-reason">
              Reject reason (shown to the vendor)
            </label>
            <textarea
              id="reject-reason"
              name="reason"
              required
              minLength={3}
              maxLength={500}
              className="w-80 rounded-box border border-grey-300 p-2 text-sm"
              disabled={!canReject}
            />
            <Button type="submit" variant="secondary" disabled={!canReject}>
              Reject
            </Button>
          </form>

          <form action={suspendOwner} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={v.id} />
            <input type="hidden" name="owner_id" value={v.owner_id} />
            <label className="text-sm" htmlFor="suspend-reason">
              Suspend reason (for the audit log)
            </label>
            <textarea
              id="suspend-reason"
              name="reason"
              required
              minLength={3}
              maxLength={500}
              className="w-80 rounded-box border border-grey-300 p-2 text-sm"
              disabled={!canSuspend}
            />
            <Button type="submit" variant="danger" disabled={!canSuspend}>
              ⚠ Suspend vendor
            </Button>
          </form>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Commission</h2>
        <p className="text-sm text-grey-700">
          Now {percent}%, free until {nptDate(v.commission_free_until)} (NPT).
        </p>
        <form action={setCommission} className="flex flex-wrap items-end gap-4">
          <input type="hidden" name="id" value={v.id} />
          <label className="flex flex-col gap-1 text-sm">
            Rate (%)
            <input
              name="percent"
              type="number"
              min={0}
              max={50}
              step={0.01}
              defaultValue={percent}
              required
              className="w-28 rounded-box border border-grey-300 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Free until (NPT day)
            <input
              name="free_until"
              type="date"
              defaultValue={v.commission_free_until ? nptDate(v.commission_free_until) : ''}
              className="rounded-box border border-grey-300 p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Note
            <input
              name="reason"
              maxLength={200}
              className="w-64 rounded-box border border-grey-300 p-2"
            />
          </label>
          <Button type="submit" variant="secondary">
            Save commission
          </Button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">History (audit log)</h2>
        {(audit.data ?? []).length === 0 ? (
          <p className="text-sm text-grey-700">No admin actions yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-grey-300">
                <th className="py-2">Time (NPT)</th>
                <th className="py-2">Action</th>
                <th className="py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {(audit.data ?? []).map((r) => {
                const after = (r.after ?? {}) as Record<string, unknown>;
                const detail =
                  typeof after.reason === 'string'
                    ? after.reason
                    : typeof after.commission_rate_bp === 'number'
                      ? `${after.commission_rate_bp / 100}%`
                      : '';
                return (
                  <tr key={r.id} className="border-b border-grey-100">
                    <td className="py-2">{nptDateTime(r.at)}</td>
                    <td className="py-2 font-mono">{r.action}</td>
                    <td className="py-2">{detail || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
