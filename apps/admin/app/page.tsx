import { formatPrice } from '@food-rescue/shared';

import { Button } from '@/components/ui/button';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Skeleton home: proves the admin reaches Supabase by reading app_settings_public. */
export default async function Home() {
  const supabase = supabaseServer();
  const result = supabase ? await supabase.from('app_settings_public').select('key, value').order('key') : null;
  const host = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : 'not set';
  const minWithdrawal = result?.data?.find((r) => r.key === 'min_withdrawal_paisa')?.value;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="rounded-box border border-grey-300 p-4 text-sm">
        <p>
          Supabase: <span className="font-semibold">{host}</span>
        </p>
        {!supabase ? (
          <p className="mt-2">⚠ Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local</p>
        ) : result?.error ? (
          <p className="mt-2">⚠ Could not read settings: {result.error.message}</p>
        ) : (
          <p className="mt-2">
            ✓ Connected. {result?.data?.length ?? 0} public settings. Minimum withdrawal:{' '}
            {typeof minWithdrawal === 'number' ? formatPrice(minWithdrawal) : '-'}
          </p>
        )}
      </div>
      {result?.data?.length ? (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-grey-300">
              <th className="py-2">Key</th>
              <th className="py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {result.data.map((r) => (
              <tr key={r.key} className="border-b border-grey-100">
                <td className="py-2 font-mono">{r.key}</td>
                <td className="py-2 font-mono break-all">{JSON.stringify(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <Button variant="secondary" disabled>
        Log in (coming soon)
      </Button>
    </div>
  );
}
