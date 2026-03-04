import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ViewBreadcrumb } from './ViewBreadcrumb';
import './view.css';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default function ViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="view-layout view-layout--no-sidebar" id="view-layout-root">
      <main className="view-main">
        <Suspense fallback={null}>
          <ViewBreadcrumb />
        </Suspense>
        {children}
      </main>
    </div>
  );
}
