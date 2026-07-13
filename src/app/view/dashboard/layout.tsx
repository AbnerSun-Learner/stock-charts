/**
 * Dashboard 依赖登录会话，避免静态预渲染时强依赖运行时配置。
 */
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
