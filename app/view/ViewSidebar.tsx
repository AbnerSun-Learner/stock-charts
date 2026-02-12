'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const MENU_ITEMS = [
  { href: '/view/sunburst', label: '仓位分布（旭日图）', icon: '☀' },
] as const;

const STORAGE_KEY = 'view-sidebar-collapsed';

export function ViewSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === '1');
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <aside className={`view-sidebar ${collapsed ? 'view-sidebar--collapsed' : ''}`}>
      <div className="view-sidebar-brand">
        <span className="view-sidebar-brand-text">仓位视图</span>
        <button
          type="button"
          className="view-sidebar-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? '展开菜单' : '收起菜单'}
          title={collapsed ? '展开菜单' : '收起菜单'}
        >
          <span className="view-sidebar-toggle-icon" aria-hidden>{collapsed ? '›' : '‹'}</span>
        </button>
      </div>
      <nav className="view-nav">
        <div className="view-nav-title">图表</div>
        <ul className="view-nav-list">
          {MENU_ITEMS.map(({ href, label, icon }) => {
            const hrefWithToken = token ? `${href}?token=${encodeURIComponent(token)}` : href;
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={hrefWithToken}
                  className={`view-nav-link ${isActive ? 'view-nav-link--active' : ''}`}
                  title={collapsed ? label : undefined}
                >
                  <span className="view-nav-link-icon" aria-hidden>{icon}</span>
                  <span className="view-nav-link-label">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
