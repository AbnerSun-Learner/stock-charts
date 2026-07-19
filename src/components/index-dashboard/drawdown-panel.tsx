import { calculateDrawdown } from '@/lib/index-dashboard/drawdown';
import type { IndexMetricPoint } from '@/types/index-dashboard';
import { PanelShell, PanelState } from './panel-shell';

export function DrawdownPanel({ points, loading, error }: { points: IndexMetricPoint[]; loading: boolean; error: string | null }) {
  const summary = calculateDrawdown(points);
  return <PanelShell title="极限跌幅" eyebrow="Drawdown stress">
    {loading ? <PanelState message="正在计算回撤…" tone="loading" /> : error ? <PanelState message={error} tone="error" /> : !summary ? <PanelState message="该指数暂无可计算的收盘数据" /> : <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5"><p className="m-0 text-xs text-[var(--text-muted)]">当前距窗口高点</p><strong className="mt-2 block font-[var(--font-display)] text-3xl tabular-nums text-[var(--loss)]">{summary.currentDrawdownPct.toFixed(2)}%</strong><p className="mt-2 mb-0 text-xs text-[var(--text-muted)]">最新 {summary.latestClose.toFixed(2)} / 高点 {summary.latestPeak.toFixed(2)}</p></div>
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5"><p className="m-0 text-xs text-[var(--text-muted)]">窗口内最大回撤</p><strong className="mt-2 block font-[var(--font-display)] text-3xl tabular-nums text-[var(--loss)]">{summary.maximumDrawdownPct.toFixed(2)}%</strong><p className="mt-2 mb-0 text-xs text-[var(--text-muted)]">{summary.peakDate} 高点 → {summary.troughDate} 低点</p></div>
    </div>}
  </PanelShell>;
}
