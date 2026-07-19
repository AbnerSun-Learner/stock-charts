'use client';

import { useEffect, useMemo, useState } from 'react';
import { Empty, Tabs } from 'antd';
import dynamic from 'next/dynamic';
import {
  filterWeightsByLevel,
  prepareIndustryPieData,
  summarizeIndustryConcentration,
} from '@/lib/index-dashboard/industry-weights';
import {
  createIndustryPieLabel,
  resolveCanvasCssColor,
} from '@/lib/index-dashboard/chart-paint';
import type { IndustryWeight, SwLevel } from '@/types/index-dashboard';
import { PanelShell, PanelState } from './panel-shell';

const Pie = dynamic(
  () => import('@ant-design/charts').then(module => module.Pie),
  { ssr: false }
);

interface IndustryWeightsPanelProps {
  weights: IndustryWeight[];
  loading?: boolean;
  error?: string | null;
}

const LEVEL_TABS: { key: SwLevel; label: string }[] = [
  { key: 'sw1', label: '申万一级' },
  { key: 'sw2', label: '申万二级' },
  { key: 'sw3', label: '申万三级' },
];

const INDUSTRY_COLORS = [
  '#2563eb',
  '#0f766e',
  '#7c3aed',
  '#f97316',
  '#dc2626',
  '#475569',
  '#65a30d',
  '#c2410c',
  '#0891b2',
  '#db2777',
  '#9333ea',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#64748b',
  '#94a3b8',
];

/**
 * 行业权重面板：sw1/2/3 Tabs + 环形图 + 结构观察。
 */
export function IndustryWeightsPanel({ weights, loading, error }: IndustryWeightsPanelProps) {
  const [level, setLevel] = useState<SwLevel>('sw1');
  const [showChartLabels, setShowChartLabels] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)');
    const update = () => setShowChartLabels(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  const filtered = useMemo(() => filterWeightsByLevel(weights, level), [weights, level]);
  const bars = useMemo(() => prepareIndustryPieData(filtered), [filtered]);
  const summary = useMemo(() => summarizeIndustryConcentration(filtered, 3), [filtered]);
  const asOfDate = filtered[0]?.asOfDate ?? null;
  const levelLabel = LEVEL_TABS.find(tab => tab.key === level)?.label ?? '申万行业';
  const chartLabelColor = resolveCanvasCssColor('--text-muted', '#64748b');
  const chartLabel = createIndustryPieLabel(showChartLabels, chartLabelColor);

  if (loading) {
    return <PanelShell title="行业权重"><PanelState message="正在加载行业权重…" tone="loading" /></PanelShell>;
  }

  if (error) return <PanelShell title="行业权重"><PanelState message={error} tone="error" /></PanelShell>;

  if (weights.length === 0) {
    return (
      <PanelShell title="行业权重">
        <Empty description="该指数暂无行业权重数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </PanelShell>
    );
  }

  return (
    <PanelShell title="行业权重">
      <Tabs
        activeKey={level}
        onChange={key => setLevel(key as SwLevel)}
        items={LEVEL_TABS.map(tab => ({ key: tab.key, label: tab.label }))}
      />
      {asOfDate ? (
        <p className="m-0 mb-3 text-sm text-[var(--text-muted)]">权重日期 {asOfDate}</p>
      ) : null}
      {filtered.length === 0 ? (
        <Empty description={`暂无 ${LEVEL_TABS.find(t => t.key === level)?.label} 数据`} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(320px,5fr)]">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 sm:p-4">
              <div className="space-y-3">
                <div className="relative h-[390px] min-w-0 sm:h-[430px]">
                  <Pie
                    data={bars}
                    angleField="weightPct"
                    colorField="name"
                    innerRadius={0.62}
                    outerRadius={0.88}
                    height={430}
                    autoFit
                    legend={false}
                    scale={{ color: { range: INDUSTRY_COLORS } }}
                    style={{ stroke: '#ffffff', lineWidth: 2 }}
                    label={chartLabel}
                    tooltip={{
                      title: (datum: { name?: string }) => datum.name,
                      items: [{ field: 'weightPct', name: '权重%' }],
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium text-[var(--text-muted)]">{levelLabel}</span>
                    <strong className="mt-1 font-[var(--font-display)] text-xl leading-tight text-[var(--text-primary)]">
                      行业暴露
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                  {bars.map((item, index) => (
                    <div
                      key={item.name}
                      className="flex min-w-0 items-center gap-2 text-xs text-[var(--text-secondary)]"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: INDUSTRY_COLORS[index % INDUSTRY_COLORS.length] }}
                        aria-hidden
                      />
                      <span className="truncate">{item.name}</span>
                      <span className="ml-auto tabular-nums text-[var(--text-muted)]">
                        {item.weightPct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 sm:p-6">
              <div className="text-xs font-semibold tracking-[0.14em] text-[var(--accent)]">
                结构观察
              </div>
              <h3 className="mt-2 mb-2 font-[var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
                当前结构最集中的三大行业
              </h3>
              <p className="m-0 text-sm leading-6 text-[var(--text-muted)]">
                基于当前 {levelLabel} 权重，更新日期 {asOfDate ?? '—'}。
              </p>

              <div className="mt-5 space-y-5">
                {summary.topIndustries.map((item, index) => (
                  <div key={item.name}>
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: INDUSTRY_COLORS[index] }}
                        aria-hidden
                      />
                      <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                      <strong className="ml-auto tabular-nums text-[var(--text-primary)]">
                        {item.weightPct.toFixed(2)}%
                      </strong>
                    </div>
                    <div className="mt-2 ml-6 h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(item.weightPct, 100)}%`,
                          backgroundColor: INDUSTRY_COLORS[index],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-sm text-[var(--text-muted)]">前三行业合计</span>
                  <strong className="font-[var(--font-display)] text-2xl tabular-nums text-[var(--text-primary)]">
                    {summary.combinedWeightPct.toFixed(2)}%
                  </strong>
                </div>
                <p className="mt-2 mb-0 text-xs leading-5 text-[var(--text-muted)]">
                  数值越高，代表指数行业暴露越集中；该指标仅描述结构，不构成投资建议。
                </p>
              </div>
            </aside>
        </div>
      )}
    </PanelShell>
  );
}
