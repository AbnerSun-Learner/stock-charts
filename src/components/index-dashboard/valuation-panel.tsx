'use client';
import { Switch } from 'antd';
import { analyzeValuation } from '@/lib/index-dashboard/metric-analysis';
import type { IndexMetricPoint, ValuationMetricKey, ValuationStatistics } from '@/types/index-dashboard';
import { PanelShell, PanelState } from './panel-shell';

const METRIC_LABEL: Record<ValuationMetricKey, string> = {
  peTtm: '市盈率',
  pb: '市净率',
};

export function ValuationPanel({
  title,
  metric,
  points,
  loading,
  error,
  showPeLine,
  onShowPeLineChange,
  peToggleEnabled = false,
}: {
  title: string;
  metric: ValuationMetricKey;
  points: IndexMetricPoint[];
  loading: boolean;
  error: string | null;
  /** 仅市盈率面板：控制走势图 PE 线显隐。 */
  showPeLine?: boolean;
  onShowPeLineChange?: (checked: boolean) => void;
  peToggleEnabled?: boolean;
}) {
  const stats = analyzeValuation(points, metric);
  const peToggle =
    metric === 'peTtm' && onShowPeLineChange ? (
      <Switch
        checked={Boolean(showPeLine)}
        disabled={!peToggleEnabled}
        onChange={onShowPeLineChange}
        aria-label="显示市盈率折线"
        data-testid="pe-line-toggle"
      />
    ) : undefined;

  if (loading) {
    return (
      <PanelShell title={title} eyebrow="Valuation distribution" action={peToggle}>
        <PanelState message={`正在加载${title}历史…`} tone="loading" />
      </PanelShell>
    );
  }
  if (error) {
    return (
      <PanelShell title={title} eyebrow="Valuation distribution" action={peToggle}>
        <PanelState message={error} tone="error" />
      </PanelShell>
    );
  }
  if (!stats) {
    return (
      <PanelShell title={title} eyebrow="Valuation distribution" action={peToggle}>
        <PanelState message={`该指数暂无${title}历史数据`} />
      </PanelShell>
    );
  }

  return (
    <PanelShell title={title} eyebrow="Valuation distribution" action={peToggle}>
      <ValuationCards stats={stats} unit={METRIC_LABEL[metric]} />
      {!stats.insufficientSamples ? <ValuationHistogram title={title} stats={stats} /> : null}
      <p className="mt-3 mb-0 text-xs leading-5 text-[var(--text-muted)]">
        截至 {stats.tradeDate} · {stats.sampleSize} 个有效交易日
        {stats.insufficientSamples ? ' · 有效样本不足，分位分布暂不展示' : ''}
      </p>
    </PanelShell>
  );
}

function ValuationCards({ stats, unit }: { stats: ValuationStatistics; unit: string }) {
  // 样本不足时只保留当前值与高低均值，分位阈值按计划不展示。
  if (stats.insufficientSamples) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label={`最新${unit}`} value={stats.current.toFixed(2)} accent />
        <Metric label="有效样本" value="不足" />
        <Metric label={`最高${unit}`} value={stats.maximum.toFixed(2)} />
        <Metric label={`最低${unit}`} value={stats.minimum.toFixed(2)} />
        <Metric label={`${unit}平均值`} value={stats.average.toFixed(2)} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Metric label="当前分位" value={`${stats.percentile.toFixed(2)}%`} accent />
      <Metric label="20% 分位" value={stats.valueAt20.toFixed(2)} />
      <Metric label="50% 分位" value={stats.valueAt50.toFixed(2)} />
      <Metric label="80% 分位" value={stats.valueAt80.toFixed(2)} />
      <Metric label={`最新${unit}`} value={stats.current.toFixed(2)} accent />
      <Metric label={`最高${unit}`} value={stats.maximum.toFixed(2)} />
      <Metric label={`最低${unit}`} value={stats.minimum.toFixed(2)} />
      <Metric label={`${unit}平均值`} value={stats.average.toFixed(2)} />
    </div>
  );
}

function ValuationHistogram({ title, stats }: { title: string; stats: ValuationStatistics }) {
  const maxCount = Math.max(...stats.bins.map(bin => bin.count), 1);
  return (
    <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
      <div className="flex h-40 items-end gap-1" aria-label={`${title}历史分布直方图`}>
        {stats.bins.map((bin, index) => (
          <div
            key={`${bin.from}-${index}`}
            title={`${bin.from.toFixed(2)}–${bin.to.toFixed(2)}：${bin.count}`}
            className={`min-w-0 flex-1 rounded-t-sm ${bin.containsCurrent ? 'bg-[var(--accent)]' : 'bg-[color-mix(in_srgb,var(--accent)_28%,transparent)]'}`}
            style={{ height: `${Math.max(4, (bin.count / maxCount) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] tabular-nums text-[var(--text-muted)]">
        <span>{stats.minimum.toFixed(2)}</span>
        <span>{stats.maximum.toFixed(2)}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border bg-[var(--bg-elevated)] p-3 ${
        accent ? 'border-[var(--accent)]' : 'border-[var(--border-subtle)]'
      }`}
    >
      <p className="m-0 text-xs text-[var(--text-muted)]">{label}</p>
      <strong
        className={`mt-1 block font-[var(--font-display)] text-xl tabular-nums ${
          accent ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
        }`}
      >
        {value}
      </strong>
    </div>
  );
}
