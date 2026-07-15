import type { Metadata, Viewport } from 'next';
import { AntdProvider } from '@/components/app-shell/antd-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import './globals.css';

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'http://localhost:3000';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Stock Charts | ETF 投资驾驶舱',
  description: 'ETF 配置、网格策略与组合复盘工作台',
  openGraph: {
    title: 'Stock Charts | ETF 投资驾驶舱',
    description: 'ETF 配置、网格策略与组合复盘工作台',
    type: 'website',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stock Charts | ETF 投资驾驶舱',
    description: 'ETF 配置、网格策略与组合复盘工作台',
  },
};

/**
 * 应用根布局：挂载全局字体与 Ant Design Provider。
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdProvider>
          <AuthProvider>{children}</AuthProvider>
        </AntdProvider>
      </body>
    </html>
  );
}
