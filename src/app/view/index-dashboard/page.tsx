import { Suspense } from 'react';
import type { Metadata } from 'next';
import { IndexDashboardPage } from '@/components/index-dashboard/index-dashboard-page';

export const metadata: Metadata = {
  title: '指数分析',
  description: '指数走势、PE/PB 估值、行业权重与极限跌幅',
};

/**
 * 指数分析路由页。
 */
export default function IndexDashboardRoutePage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">加载中…</div>}>
      <IndexDashboardPage />
    </Suspense>
  );
}
