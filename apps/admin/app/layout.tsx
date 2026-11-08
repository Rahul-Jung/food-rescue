import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Food Rescue Admin',
  robots: { index: false, follow: false },
};

const NAV = ['Vendors', 'Customers', 'Orders', 'Accounting', 'Payouts', 'Refunds', 'Reviews', 'Featured', 'Settings', 'Audit'];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <nav className="w-56 shrink-0 border-r border-grey-300 p-4">
            <p className="mb-6 text-lg font-semibold">Food Rescue Admin</p>
            <ul className="space-y-1 text-sm">
              {NAV.map((item) => (
                <li key={item} className="rounded-box px-2 py-2 text-grey-500" title="Built in a later task">
                  {item}
                </li>
              ))}
            </ul>
          </nav>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
