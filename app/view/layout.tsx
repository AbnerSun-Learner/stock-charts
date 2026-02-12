import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ViewSidebar } from './ViewSidebar';
import { EmbedDetector } from './EmbedDetector';
import './view.css';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

function SidebarFallback() {
  return (
    <aside className="view-sidebar">
      <nav className="view-nav">
        <div className="view-nav-title">图表</div>
        <ul className="view-nav-list">
          <li>
            <span className="view-nav-link">仓位分布（旭日图）</span>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default function ViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="view-layout" id="view-layout-root">
      <EmbedDetector />
      <Suspense fallback={<SidebarFallback />}>
        <ViewSidebar />
      </Suspense>
      <main className="view-main">{children}</main>
    </div>
  );
}
