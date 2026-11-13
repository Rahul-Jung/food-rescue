import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

const NAV = [
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
          {NAV.map((item) => (
            <li
              key={item}
              className="rounded-box px-2 py-2 text-grey-500"
              title="Built in a later task"
            >
              {item}
            </li>
          ))}
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
