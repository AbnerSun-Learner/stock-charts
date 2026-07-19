'use client';
import { analyzeValuation } from '@/lib/index-dashboard/metric-analysis';
import type { IndexMetricPoint, ValuationMetricKey } from '@/types/index-dashboard';
import { PanelShell, PanelState } from './panel-shell';

export function ValuationPanel({ title, metric, points, loading, error }: { title: string; metric: ValuationMetricKey; points: IndexMetricPoint[]; loading: boolean; error: string | null }) {
  const stats = analyzeValuation(points, metric);
  const maxCount = stats ? Math.max(...stats.bins.map(bin => bin.count), 1) : 1;
  return <PanelShell title={title} eyebrow="Valuation distribution">
    {loading ? <PanelState message={`正在加载${title}历史…`} tone="loading" /> : error ? <PanelState message={error} tone="error" /> : !stats ? <PanelState message={`该指数暂无${title}历史数据`} /> : <>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="当前" value={stats.current.toFixed(2)} accent />
        <Metric label="历史分位" value={`${stats.percentile.toFixed(1)}%`} />
        <Metric label="历史均值" value={stats.average.toFixed(2)} />
        <Metric label="区间" value={`${stats.minimum.toFixed(2)} – ${stats.maximum.toFixed(2)}`} />
      </div>
      <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
        <div className="flex h-40 items-end gap-1" aria-label={`${title}历史分布直方图`}>{stats.bins.map((bin, index) => <div key={`${bin.from}-${index}`} title={`${bin.from.toFixed(2)}–${bin.to.toFixed(2)}：${bin.count}`} className={`min-w-0 flex-1 rounded-t-sm ${bin.containsCurrent ? 'bg-[var(--accent)]' : 'bg-[color-mix(in_srgb,var(--accent)_28%,transparent)]'}`} style={{ height: `${Math.max(4, bin.count / maxCount * 100)}%` }} />)}</div>
        <div className="mt-2 flex justify-between text-[11px] tabular-nums text-[var(--text-muted)]"><span>{stats.minimum.toFixed(2)}</span><span>{stats.maximum.toFixed(2)}</span></div>
      </div>
      <p className="mt-3 mb-0 text-xs leading-5 text-[var(--text-muted)]">截至 {stats.tradeDate} · {stats.sampleSize} 个有效交易日{stats.insufficientSamples ? ' · 样本较少，分位仅供参考' : ''}</p>
    </>}
  </PanelShell>;
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"><p className="m-0 text-xs text-[var(--text-muted)]">{label}</p><strong className={`mt-1 block font-[var(--font-display)] text-xl tabular-nums ${accent ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>{value}</strong></div>; }
