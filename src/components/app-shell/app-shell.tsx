'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  ChevronRight,
  CircleDollarSign,
  Grid3X3,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PieChart,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { AuthModal } from '@/components/auth/auth-modal';
import { useAuth } from '@/components/auth/auth-provider';
import { getAuthActionLabel } from '@/lib/supabase/auth-ui';
import { SidebarProvider, useSidebar } from './sidebar-context';

type AppShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: string;
  disabled?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  {
    href: '/',
    label: '概览',
    icon: <LayoutDashboard aria-hidden />,
    match: '/',
  },
  {
    href: '/view/dashboard',
    label: '资产配置',
    icon: <CircleDollarSign aria-hidden />,
    match: '/view/dashboard',
  },
  {
    href: '/view/grid',
    label: '网格策略',
    icon: <Grid3X3 aria-hidden />,
    match: '/view/grid',
  },
  {
    href: '#',
    label: '复盘',
    icon: <BarChart3 aria-hidden />,
    disabled: true,
  },
];

const TOOL_NAV: NavItem[] = [
  {
    href: '/view/sunburst',
    label: '旭日图',
    icon: <PieChart aria-hidden />,
    match: '/view/sunburst',
  },
];

const ROUTE_LABELS: Record<string, string> = {
  '/': '概览',
  '/view/dashboard': '资产配置',
  '/view/grid': '网格策略',
  '/view/sunburst': '旭日图',
};

function isActive(item: NavItem, pathname: string) {
  if (!item.match) return false;
  if (item.match === '/') return pathname === '/';
  return pathname.startsWith(item.match);
}

function SidebarBrand() {
  const { collapsed } = useSidebar();

  return (
    <div className="sb-brand">
      <Link href="/" className="sb-mark" aria-label="Stock Charts 首页">
        SC
      </Link>
      {!collapsed ? (
        <Link href="/" className="sb-name" aria-label="Stock Charts 首页">
          <strong>Stock Charts</strong>
          <span>ETF Cockpit</span>
        </Link>
      ) : null}
    </div>
  );
}

function SidebarNavGroup({
  title,
  items,
}: {
  title?: string;
  items: NavItem[];
}) {
  const { collapsed } = useSidebar();
  const pathname = usePathname() || '/';

  return (
    <div className="sb-group">
      {!collapsed && title ? <div className="sb-section">{title}</div> : null}
      {collapsed && title ? <div className="sb-section-divider" /> : null}
      {items.map(item => {
        const active = isActive(item, pathname);
        const className = [
          'sb-item',
          active ? 'active' : '',
          collapsed ? 'collapsed' : '',
          item.disabled ? 'disabled' : '',
        ]
          .filter(Boolean)
          .join(' ');

        if (item.disabled) {
          return (
            <span
              key={item.label}
              className={className}
              title={collapsed ? item.label : undefined}
              aria-disabled="true"
            >
              <span className="sb-item-ico">{item.icon}</span>
              {!collapsed ? <span className="sb-item-label">{item.label}</span> : null}
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={className}
            title={collapsed ? item.label : undefined}
          >
            <span className="sb-item-ico">{item.icon}</span>
            {!collapsed ? <span className="sb-item-label">{item.label}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

function SidebarUserMenu() {
  const { collapsed } = useSidebar();
  const { status, userLabel } = useAuth();
  const userEmail = status === 'authenticated' ? 'GitHub OAuth' : '未登录';

  return (
    <div className={`sb-user${collapsed ? ' collapsed' : ''}`}>
      <button
        type="button"
        className={`sb-user-btn${collapsed ? ' collapsed' : ''}`}
        title={collapsed ? '本地用户' : undefined}
        aria-label="用户菜单"
      >
        <span className="sb-avatar">
          <UserRound aria-hidden />
        </span>
        {!collapsed ? (
          <span className="sb-user-meta">
            <span className="sb-user-name">{userLabel}</span>
            <span className="sb-user-email">{userEmail}</span>
          </span>
        ) : null}
      </button>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="主导航">
      <div className="sb-scroll">
        <SidebarNavGroup items={PRIMARY_NAV} />
        <SidebarNavGroup title="工具" items={TOOL_NAV} />
      </div>
      <SidebarUserMenu />
    </aside>
  );
}

function Topbar() {
  const { collapsed, toggleCollapsed } = useSidebar();
  const { signOutCurrentUser, status } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const pathname = usePathname() || '/';
  const currentLabel = ROUTE_LABELS[pathname] ?? '详情';
  const authLabel = getAuthActionLabel(status);

  const onAuthAction = () => {
    if (status === 'authenticated') {
      void signOutCurrentUser();
      return;
    }
    setLoginOpen(true);
  };

  return (
    <div className="topbar">
      <div className="topbar-leading">
        <button
          type="button"
          className="sb-collapse-btn topbar-collapse-btn"
          onClick={toggleCollapsed}
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? <Menu aria-hidden /> : <PanelLeftClose aria-hidden />}
        </button>
        <nav className="topbar-breadcrumb" aria-label="面包屑">
          <Link href="/">Stock Charts</Link>
          {pathname !== '/' ? (
            <>
              <ChevronRight aria-hidden />
              <span>{currentLabel}</span>
            </>
          ) : null}
        </nav>
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-auth-btn"
          onClick={onAuthAction}
          disabled={status === 'loading'}
        >
          {authLabel}
        </button>
      </div>
      <AuthModal
        open={loginOpen}
        nextPath={pathname}
        onClose={() => setLoginOpen(false)}
      />
    </div>
  );
}

function AppShellInner({ children }: AppShellProps) {
  const { collapsed } = useSidebar();

  return (
    <div className={`app${collapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="app-sidebar-rail">
        <SidebarBrand />
        <Sidebar />
      </div>
      <div className="app-main-rail">
        <Topbar />
        <main className="main">
          <div className="main-scroll">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  );
}
