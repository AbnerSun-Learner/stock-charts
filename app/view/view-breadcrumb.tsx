'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumb } from 'antd';

const ROUTES: Record<string, string> = {
  '/view/sunburst': '资产旭日图',
};

/**
 * 分析视图的面包屑导航，展示从首页到当前视图的路径。
 */
export function ViewBreadcrumb() {
  const pathname = usePathname();

  const items = [
    { title: <Link href="/">工具集</Link> },
    ...(pathname && pathname !== '/' ? [{ title: ROUTES[pathname] ?? '详情' }] : []),
  ];

  return (
    <nav
      className="mb-4 [&_.ant-breadcrumb-link]:text-[var(--text-muted)] [&_.ant-breadcrumb-link:hover]:text-[var(--text-accent)] [&_.ant-breadcrumb-separator]:text-[var(--text-muted)] [&_.ant-breadcrumb-separator]:opacity-60"
      aria-label="面包屑"
    >
      <Breadcrumb items={items} />
    </nav>
  );
}
