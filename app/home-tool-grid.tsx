/** 首页工具卡片网格，用于展示各投研工具入口。 */
'use client';

import { useRouter } from 'next/navigation';
import { Card, Row, Col, Button } from 'antd';

const TOOLS = [
  {
    id: 'sunburst',
    title: '资产旭日图',
    description: '上传 JSON 数据生成资产配置可视化图表，支持导出配置与 PNG 图片',
    href: '/view/sunburst',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.35" />
      </svg>
    ),
    stats: '资产分布 · 多层级',
  },
  {
    id: 'coming-soon-1',
    title: '收益归因',
    description: '分析投资组合收益来源，分解_alpha、beta 等因子贡献',
    href: '#',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M3 20L8 15L13 18L21 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 9H21V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    coming: true,
  },
  {
    id: 'coming-soon-2',
    title: '持仓分析',
    description: '多维度分析股票持仓结构，行业分布、市值风格一键洞察',
    href: '#',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      </svg>
    ),
    coming: true,
  },
  {
    id: 'coming-soon-3',
    title: '风险仪表盘',
    description: '一屏展示波动率、最大回撤、夏普比率等核心风险指标',
    href: '#',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    coming: true,
  },
] as const;

export function HomeToolGrid() {
  const router = useRouter();

  return (
    <Row gutter={[20, 20]} className="mt-0">
      {TOOLS.map((tool, index) => (
        <Col xs={24} sm={12} lg={6} key={tool.id}>
          <Card
            variant="borderless"
            className="home-tool-card group relative opacity-0 animate-[cardFadeIn_0.4s_var(--ease-out-expo)_both]"
            style={{ animationDelay: `${0.08 + index * 0.04}s` }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--accent)] to-[var(--success)] opacity-0 transition-opacity duration-[0.25s] group-hover:opacity-100" />
            <div className="w-14 h-14 flex items-center justify-center mx-auto mb-5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent)] transition-all duration-[0.25s] group-hover:bg-[var(--accent-soft)] group-hover:border-[var(--accent-glow)]">
              {tool.icon}
            </div>
            <h2 className="font-[var(--font-display)] text-[1.0625rem] font-semibold text-[var(--text-primary)] m-0 mb-2.5 text-center">
              {tool.title}
            </h2>
            <p className="text-[0.8125rem] text-[var(--text-muted)] leading-relaxed m-0 mb-6 flex-1 text-center">
              {tool.description}
            </p>
            {'coming' in tool && tool.coming ? (
              <Button size="middle" disabled className="home-tool-card-btn">
                即将上线
              </Button>
            ) : (
              <Button size="middle" onClick={() => router.push(tool.href)} className="home-tool-card-btn">
                立即使用
              </Button>
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );
}
