import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

/** Pages built so far link; the rest arrive in later sprints. */
const BUILT: Record<string, string> = { Dashboard: '/', Vendors: '/vendors' };

const NAV = [
  'Dashboard',
  'Vendors',
  'Customers',
  'Orders',
  'Accounting',
  'Payouts',
  'Refunds',
  'Reviews',
  'Featured',
  'Settings',
  'Audit',
];

/** Signed-in admin panel (the proxy only lets admins with TOTP in). */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="flex w-56 shrink-0 flex-col border-r border-grey-300 p-4">
        <p className="mb-6 text-lg font-semibold">Food Rescue Admin</p>
        <ul className="flex-1 space-y-1 text-sm">
          {NAV.map((item) =>
            BUILT[item] ? (
              <li key={item}>
                <Link
                  href={BUILT[item]}
                  className="block rounded-box px-2 py-2 text-ink hover:bg-grey-100"
                >
                  {item}
                </Link>
              </li>
            ) : (
              <li
                key={item}
                className="rounded-box px-2 py-2 text-grey-500"
                title="Built in a later task"
              >
                {item}
              </li>
            ),
          )}
        </ul>
        <form action="/logout" method="post">
          <Button type="submit" variant="secondary" className="w-full">
            Log out
          </Button>
        </form>
      </nav>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
