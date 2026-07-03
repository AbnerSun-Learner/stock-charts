import type { Metadata, Viewport } from 'next';
import { AntdProvider } from '@/components/app-shell/antd-provider';
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
  title: '仓位视图 | 投资图表',
  description: '私有投资图表与仓位分布',
  openGraph: {
    title: '仓位视图 | 投资图表',
    description: '私有投资图表与仓位分布',
    type: 'website',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: '仓位视图 | 投资图表',
    description: '私有投资图表与仓位分布',
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
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
