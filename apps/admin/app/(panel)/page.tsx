import { formatPrice, formatTime } from '@food-rescue/shared';

import { hasSupabaseConfig, supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Dashboard skeleton: settings check plus the latest audit_log rows (admins read, aal2). */
export default async function Home() {
  if (!hasSupabaseConfig()) {
    return (
      <p className="text-sm">
        ⚠ Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
      </p>
    );
  }
  const supabase = await supabaseServer();
  const [settings, audit] = await Promise.all([
    supabase.from('app_settings_public').select('key, value').order('key'),
    supabase
      .from('audit_log')
      .select('id, action, ip, user_agent, at')
      .order('at', { ascending: false })
      .limit(10),
  ]);
  const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://unset').host;
  const minWithdrawal = settings.data?.find((r) => r.key === 'min_withdrawal_paisa')?.value;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="rounded-box border border-grey-300 p-4 text-sm">
        <p>
          Supabase: <span className="font-semibold">{host}</span>
        </p>
        {settings.error ? (
          <p className="mt-2">⚠ Could not read settings: {settings.error.message}</p>
        ) : (
          <p className="mt-2">
            ✓ Connected. {settings.data?.length ?? 0} public settings. Minimum withdrawal:{' '}
            {typeof minWithdrawal === 'number' ? formatPrice(minWithdrawal) : '-'}
          </p>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Recent activity (audit log)</h2>
        {audit.error ? (
          <p className="text-sm">⚠ Could not read the audit log: {audit.error.message}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-grey-300">
                <th className="py-2">Time (NPT)</th>
                <th className="py-2">Action</th>
                <th className="py-2">IP</th>
                <th className="py-2">Browser</th>
              </tr>
            </thead>
            <tbody>
              {(audit.data ?? []).map((r) => (
                <tr key={r.id} className="border-b border-grey-100">
                  <td className="py-2">{formatTime(r.at)}</td>
                  <td className="py-2 font-mono">{r.action}</td>
                  <td className="py-2 font-mono">{String(r.ip ?? '-')}</td>
                  <td className="max-w-xs truncate py-2" title={r.user_agent ?? ''}>
                    {r.user_agent ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
