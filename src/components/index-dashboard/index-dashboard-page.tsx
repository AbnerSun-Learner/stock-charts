'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowUpRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DrawdownPanel } from './drawdown-panel';
import { IndexOverviewPanel } from './index-overview-panel';
import { IndexSelector } from './index-selector';
import { PanelShell, PanelState } from './panel-shell';
import { ValuationPanel } from './valuation-panel';
import { filterMetricWindow, maskUnfinalizedCloses } from '@/lib/index-dashboard/metric-analysis';
import { LatestRequestGuard } from '@/lib/index-dashboard/latest-request-guard';
import { buildGridStrategyHref } from '@/lib/grid/grid-prefill';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { IndexMarketRepository } from '@/lib/supabase/index-market-repository';
import type { AnalysisWindow, IndexMetricPoint, IndexWithEtf, IndustryWeight } from '@/types/index-dashboard';

const IndustryWeightsPanel = dynamic(() => import('./industry-weights-panel').then(module => module.IndustryWeightsPanel), {
  ssr: false,
  loading: () => <PanelShell title="行业权重"><PanelState message="正在加载行业图表…" tone="loading" /></PanelShell>,
});

interface Resource<T> { data: T; loading: boolean; error: string | null }
const resource = <T,>(data: T): Resource<T> => ({ data, loading: false, error: null });

export function IndexDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code');
  const [indices, setIndices] = useState<IndexWithEtf[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [window, setWindow] = useState<AnalysisWindow>('all');
  const [metrics, setMetrics] = useState<Resource<IndexMetricPoint[]>>(resource([]));
  const [weights, setWeights] = useState<Resource<IndustryWeight[]>>(resource([]));
  const [latestPrice, setLatestPrice] = useState<Resource<number | null>>(resource(null));
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const repo = useMemo(() => new IndexMarketRepository(createBrowserSupabaseClient()), []);
  const guard = useMemo(() => new LatestRequestGuard(), []);
  const selected = useMemo(() => indices.find(item => item.indexCode === selectedCode) ?? null, [indices, selectedCode]);
  const visibleMetrics = useMemo(
    () => maskUnfinalizedCloses(filterMetricWindow(metrics.data, window)),
    [metrics.data, window]
  );

  useEffect(() => () => guard.invalidate(), [guard]);
  useEffect(() => {
    let cancelled = false;
    void repo.listIndicesWithEtf().then(list => {
      if (cancelled) return;
      setIndices(list);
      setSelectedCode((initialCode && list.some(item => item.indexCode === initialCode) ? initialCode : list[0]?.indexCode) ?? null);
    }).catch(error => !cancelled && setListError(error instanceof Error ? error.message : '加载指数列表失败')).finally(() => !cancelled && setListLoading(false));
    return () => { cancelled = true; };
    // URL code 只用于首次选中。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);

  useEffect(() => {
    if (!selected) return;
    const requestId = guard.begin();
    setMetrics(previous => ({ ...previous, loading: true, error: null }));
    setWeights(previous => ({ ...previous, loading: true, error: null }));
    setLatestPrice(previous => ({ ...previous, loading: true, error: null }));
    void repo.getIndexMetrics(selected.indexCode).then(data => guard.isLatest(requestId) && setMetrics({ data, loading: false, error: null })).catch(error => guard.isLatest(requestId) && setMetrics({ data: [], loading: false, error: error instanceof Error ? error.message : '指数历史加载失败' }));
    void repo.getIndustryWeights(selected.indexCode).then(data => guard.isLatest(requestId) && setWeights({ data, loading: false, error: null })).catch(error => guard.isLatest(requestId) && setWeights({ data: [], loading: false, error: error instanceof Error ? error.message : '行业权重加载失败' }));
    void repo.getLatestEtfClose(selected.etfCode).then(data => guard.isLatest(requestId) && setLatestPrice({ data, loading: false, error: null })).catch(error => guard.isLatest(requestId) && setLatestPrice({ data: null, loading: false, error: error instanceof Error ? error.message : 'ETF 最新价加载失败' }));
  }, [selected, repo, guard]);

  const handleSelect = (code: string) => {
    setSelectedCode(code);
    const params = new URLSearchParams(searchParams.toString());
    params.set('code', code);
    router.replace(`${pathname}?${params}`, { scroll: false });
  };
  const gridHref = selected ? buildGridStrategyHref({ etfCode: selected.etfCode, etfName: selected.etfName, latestPrice: latestPrice.data }) : '/view/grid';

  return <div className="mx-auto max-w-[1480px] animate-[pageFadeIn_0.5s_var(--ease-out-expo)_both]">
    <header className="mb-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Index analytics</p>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="m-0 font-[var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--text-primary)]">指数分析</h1><p className="mt-2 mb-0 text-sm text-[var(--text-muted)]">走势、估值分布、行业结构与历史回撤</p></div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto"><IndexSelector options={indices} value={selectedCode} onChange={handleSelect} loading={listLoading} /><Link href={gridHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:brightness-105">前往网格策略<ArrowUpRight size={16} /></Link></div>
      </div>
      {selected ? <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-muted)]"><span>{selected.indexName} · {selected.indexCode}</span><span>跟踪 ETF：{selected.etfName}（{selected.etfCode}）</span><span>{latestPrice.loading ? '读取最新价…' : latestPrice.data ? `ETF 最新价 ${latestPrice.data.toFixed(3)}` : 'ETF 最新价暂无'}</span></div> : null}
      {listError ? <div role="alert" className="mt-4 text-sm text-[var(--loss)]">{listError}</div> : null}
    </header>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(380px,0.9fr)]">
      <div data-testid="index-dashboard-left-column" className="min-w-0 space-y-5">
        <ColumnHeading title="走势与结构" description="指数价格轨迹与申万行业暴露" />
        <IndexOverviewPanel points={visibleMetrics} window={window} onWindowChange={setWindow} loading={metrics.loading} error={metrics.error} />
        <IndustryWeightsPanel weights={weights.data} loading={weights.loading} error={weights.error} />
      </div>
      <div data-testid="index-dashboard-right-column" className="min-w-0 space-y-5">
        <ColumnHeading title="估值与风险" description="历史估值位置与回撤压力" />
        <ValuationPanel title="市盈率 PE_TTM" metric="peTtm" points={visibleMetrics} loading={metrics.loading} error={metrics.error} />
        <ValuationPanel title="市净率 PB" metric="pb" points={visibleMetrics} loading={metrics.loading} error={metrics.error} />
        <DrawdownPanel points={visibleMetrics} loading={metrics.loading} error={metrics.error} />
      </div>
    </div>
  </div>;
}

function ColumnHeading({ title, description }: { title: string; description: string }) {
  return <div className="flex items-end justify-between gap-4 px-1 pb-1">
    <h2 className="m-0 font-[var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
    <span className="text-xs text-[var(--text-muted)]">{description}</span>
  </div>;
}
