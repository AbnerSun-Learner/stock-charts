import type { Metadata } from 'next';
import { Calistoga, Inter, Noto_Sans_SC } from 'next/font/google';
import './grid.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

const calistoga = Calistoga({
  variable: '--font-calistoga',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

const notoSansSC = Noto_Sans_SC({
  variable: '--font-noto-sans-sc',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '网格交易策略 | 投资图表',
  description: '配置网格步长与资金系数，生成策略并推演抗跌优势',
};

/**
 * 网格策略页布局：独立字体与设计体系，不影响首页与 view 面包屑对齐。
 */
export default function GridLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid-shell ${inter.variable} ${calistoga.variable} ${notoSansSC.variable}`}
    >
      {children}
    </div>
  );
}
