'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumb } from 'antd';

const ROUTES: Record<string, string> = {
  '/view/sunburst': '旭日图生成',
};

export function ViewBreadcrumb() {
  const pathname = usePathname();

  const items = [
    { title: <Link href="/">首页</Link> },
    ...(pathname && pathname !== '/' ? [{ title: ROUTES[pathname] ?? pathname.slice(1) }] : []),
  ];

  return (
    <nav className="view-breadcrumb" aria-label="面包屑">
      <Breadcrumb items={items} />
    </nav>
  );
}
