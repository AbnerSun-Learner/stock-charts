'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CircleDollarSign,
  Grid3X3,
  PieChart,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { AuthModal } from '@/components/auth/auth-modal';
import { useAuth } from '@/components/auth/auth-provider';
import { canEnterProtectedRoute } from '@/lib/supabase/auth-ui';

const summaryItems = [
  {
    label: '总资产',
    value: '待接入',
    meta: '账本同步后展示',
  },
  {
    label: '配置偏离',
    value: '0.0%',
    meta: '目标配置未设置',
  },
  {
    label: '待再平衡',
    value: '0 项',
    meta: '暂无待处理动作',
  },
  {
    label: 'XIRR',
    value: '--',
    meta: '收益序列不足',
  },
];

const actionItems = [
  {
    title: '完善组合账本',
    description: '录入目标配置、现金账户与持仓后，看板会计算偏离和再平衡建议。',
    href: '/view/dashboard',
    icon: <CircleDollarSign aria-hidden />,
  },
  {
    title: '生成网格策略',
    description: '根据预算、价格区间和步长配置生成档位，并推演抗跌优势。',
    href: '/view/grid',
    icon: <Grid3X3 aria-hidden />,
  },
];

const activityItems = [
  {
    title: 'UI Shell 已切换为驾驶舱结构',
    meta: '概览、资产配置、网格策略和工具入口统一收敛到侧栏',
  },
  {
    title: '组合看板保留页面级鉴权',
    meta: '首页可浏览默认概览，进入资产配置仍需 GitHub OAuth',
  },
  {
    title: '旭日图归入工具分组',
    meta: '旧 URL /view/sunburst 继续可用',
  },
];

const toolItems = [
  {
    title: '资产配置',
    description: '目标、持仓、偏离与再平衡建议',
    href: '/view/dashboard',
    icon: <CircleDollarSign aria-hidden />,
  },
  {
    title: '网格策略',
    description: '价格区间、资金系数与压力测试',
    href: '/view/grid',
    icon: <Grid3X3 aria-hidden />,
  },
  {
    title: '资产旭日图',
    description: '按资产层级查看持仓占比结构',
    href: '/view/sunburst',
    icon: <PieChart aria-hidden />,
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

export function HomeWorkbench() {
  const router = useRouter();
  const { status, userLabel } = useAuth();
  const [greeting, setGreeting] = useState('你好');
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const openAssetAllocation = () => {
    if (canEnterProtectedRoute(status)) {
      router.push('/view/dashboard');
      return;
    }
    setLoginOpen(true);
  };

  return (
    <div className="workbench-page">
      <header className="workbench-hero">
        <div>
          <p className="workbench-kicker">Stock Charts</p>
          <h1>{userLabel}，{greeting}</h1>
          <p>聚焦 ETF 配置、网格计划与组合复盘，把下一步动作放在第一屏。</p>
        </div>
        <button
          type="button"
          className="workbench-primary-link"
          onClick={openAssetAllocation}
        >
          打开资产配置
          <ArrowRight aria-hidden />
        </button>
      </header>

      <section className="summary-grid" aria-label="组合摘要">
        {summaryItems.map(item => (
          <article className="summary-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.meta}</p>
          </article>
        ))}
      </section>

      <section className="workbench-grid" aria-label="工作台">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>需要你处理</h2>
              <p>优先完成影响驾驶舱准确性的配置。</p>
            </div>
            <RefreshCw aria-hidden />
          </div>
          <div className="action-list">
            {actionItems.map(item => (
              <button
                type="button"
                className="action-row"
                key={item.title}
                onClick={
                  item.href === '/view/dashboard'
                    ? openAssetAllocation
                    : () => router.push(item.href)
                }
              >
                <span className="action-icon">{item.icon}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <ArrowRight aria-hidden />
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>最近动态</h2>
              <p>本批次只展示结构化占位。</p>
            </div>
            <TrendingUp aria-hidden />
          </div>
          <div className="activity-list">
            {activityItems.map(item => (
              <div className="activity-row" key={item.title}>
                <span />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel tool-panel" aria-label="工具列表">
        <div className="panel-header">
          <div>
            <h2>工具与视图</h2>
            <p>保留现有功能入口，但不再作为营销卡片墙。</p>
          </div>
        </div>
        <div className="tool-list">
          {toolItems.map(item =>
            item.href === '/view/dashboard' ? (
              <button
                type="button"
                className="tool-row"
                key={item.title}
                onClick={openAssetAllocation}
              >
                <span className="tool-icon">{item.icon}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <ArrowRight aria-hidden />
              </button>
            ) : (
              <Link className="tool-row" href={item.href} key={item.title}>
                <span className="tool-icon">{item.icon}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <ArrowRight aria-hidden />
              </Link>
            )
          )}
        </div>
      </section>
      <AuthModal
        open={loginOpen}
        nextPath="/view/dashboard"
        onClose={() => setLoginOpen(false)}
      />
    </div>
  );
}
