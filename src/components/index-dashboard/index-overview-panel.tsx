'use client';
import dynamic from 'next/dynamic';
import { PanelShell, PanelState } from './panel-shell';
import { WindowSwitch } from './window-switch';
import type { AnalysisWindow, IndexMetricPoint } from '@/types/index-dashboard';

const Line = dynamic(() => import('@ant-design/charts').then(module => module.Line), { ssr: false });

export function IndexOverviewPanel({ points, window, onWindowChange, loading, error }: { points: IndexMetricPoint[]; window: AnalysisWindow; onWindowChange: (value: AnalysisWindow) => void; loading: boolean; error: string | null }) {
  const data = points.filter(point => point.close != null).map(point => ({ date: point.tradeDate, value: point.close }));
  return <PanelShell title="指数走势" eyebrow="Index history" action={<WindowSwitch value={window} onChange={onWindowChange} />}>
    {loading ? <PanelState message="正在加载指数历史…" tone="loading" /> : error ? <PanelState message={error} tone="error" /> : data.length === 0 ? <PanelState message="该指数暂无历史走势数据" /> : <>
      <div className="mb-4 flex items-end justify-between gap-4"><div><p className="m-0 text-xs text-[var(--text-muted)]">最新收盘</p><strong className="font-[var(--font-display)] text-2xl tabular-nums text-[var(--text-primary)]">{data.at(-1)!.value!.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}</strong></div><span className="text-xs text-[var(--text-muted)]">{data.at(-1)!.date}</span></div>
      <div className="h-[300px]"><Line data={data} xField="date" yField="value" height={300} autoFit smooth={false} axis={{ x: { labelAutoRotate: false, labelAutoHide: true }, y: { labelFormatter: (value: string) => Number(value).toLocaleString('zh-CN') } }} style={{ lineWidth: 2 }} tooltip={{ title: 'date', items: [{ field: 'value', name: '收盘点位' }] }} /></div>
    </>}
  </PanelShell>;
}
