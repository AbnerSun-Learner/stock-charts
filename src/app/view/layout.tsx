import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell/app-shell';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

/**
 * 分析视图通用布局：保留旧 /view/* URL，并纳入产品级 App Shell。
 */
export default function ViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <div className="shell-page">{children}</div>
    </AppShell>
  );
}
