'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { resolveCanvasCssColor } from '@/lib/index-dashboard/chart-paint';
import {
  buildOverviewChartSeries,
  formatIndexPointsInK,
} from '@/lib/index-dashboard/overview-chart';
import {
  buildOverviewTooltipIndex,
  renderOverviewTooltipHtml,
} from '@/lib/index-dashboard/overview-tooltip';
import type { AnalysisWindow, IndexMetricPoint } from '@/types/index-dashboard';
import { PanelShell, PanelState } from './panel-shell';
import { WindowSwitch } from './window-switch';

const DualAxes = dynamic(() => import('@ant-design/charts').then(module => module.DualAxes), { ssr: false });

const CLOSE_COLOR = '#0f766e';
const PE_COLOR = '#c2410c';

export function IndexOverviewPanel({
  points,
  window,
  onWindowChange,
  showPeLine,
  indexName,
  indexCode,
  loading,
  error,
}: {
  points: IndexMetricPoint[];
  window: AnalysisWindow;
  onWindowChange: (value: AnalysisWindow) => void;
  showPeLine: boolean;
  indexName: string;
  indexCode: string;
  loading: boolean;
  error: string | null;
}) {
  const series = useMemo(() => buildOverviewChartSeries(points, showPeLine), [points, showPeLine]);
  const tooltipIndex = useMemo(
    () =>
      buildOverviewTooltipIndex(points, {
        indexName,
        indexCode,
        includePe: showPeLine,
      }),
    [points, indexName, indexCode, showPeLine]
  );
  const axisColor = resolveCanvasCssColor('--text-muted', '#64748b');

  const chartProps = useMemo(() => {
    const renderTooltip = (_event: unknown, options: { title?: unknown; items?: Array<{ data?: { date?: string } }> }) => {
      const fromItem = options.items?.find(item => item.data?.date)?.data?.date;
      const title = typeof options.title === 'string' ? options.title : null;
      const date = fromItem ?? title;
      if (!date) return '';
      return renderOverviewTooltipHtml(tooltipIndex.byDate.get(date) ?? null);
    };

    const closeChild = {
      type: 'line' as const,
      yField: 'close',
      style: { stroke: CLOSE_COLOR, lineWidth: 2 },
      scale: { y: { independent: true, nice: true, key: 'close' } },
      axis: {
        y: {
          position: 'right' as const,
          labelFormatter: (value: number | string) => formatIndexPointsInK(Number(value)),
          labelFill: axisColor,
          title: null,
          grid: null,
        },
      },
      // 保留默认命中，真正文案由 interaction.tooltip.render 接管
      tooltip: {
        title: 'date',
        items: [{ field: 'close', name: '收盘点位' }],
      },
    };

    const children = series.hasPe
      ? [
          {
            type: 'line' as const,
            yField: 'pe',
            style: { stroke: PE_COLOR, lineWidth: 2 },
            scale: { y: { independent: true, nice: true, key: 'pe' } },
            axis: {
              y: {
                position: 'left' as const,
                labelFill: axisColor,
                title: null,
              },
            },
            tooltip: {
              title: 'date',
              items: [{ field: 'pe', name: '市盈率' }],
            },
          },
          closeChild,
        ]
      : [closeChild];

    return {
      data: series.rows,
      xField: 'date',
      height: 300,
      autoFit: true,
      legend: false,
      axis: { x: { labelAutoRotate: false, labelAutoHide: true, labelFill: axisColor } },
      children,
      interaction: {
        tooltip: {
          shared: true,
          crosshairs: true,
          marker: true,
          mount: 'body',
          css: {
            '.g2-tooltip': {
              background: '#fff !important',
              border: '1px solid #e2e8f0 !important',
              borderRadius: '8px !important',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12) !important',
              padding: '10px 12px !important',
            },
          },
          render: renderTooltip,
        },
      },
    };
  }, [axisColor, series.hasPe, series.rows, tooltipIndex]);

  return (
    <PanelShell title="指数走势" eyebrow="Index history" action={<WindowSwitch value={window} onChange={onWindowChange} />}>
      {loading ? (
        <PanelState message="正在加载指数历史…" tone="loading" />
      ) : error ? (
        <PanelState message={error} tone="error" />
      ) : !series.latestClose ? (
        <PanelState message="该指数暂无历史走势数据" />
      ) : (
        <>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="m-0 text-xs text-[var(--text-muted)]">最新收盘</p>
              <strong className="font-[var(--font-display)] text-2xl tabular-nums text-[var(--text-primary)]">
                {series.latestClose.close.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
              </strong>
            </div>
            <span className="text-xs text-[var(--text-muted)]">{series.latestClose.date}</span>
          </div>
          <div className="h-[300px]" data-testid="index-overview-chart">
            <DualAxes key={series.hasPe ? 'pe-on' : 'pe-off'} {...chartProps} />
          </div>
        </>
      )}
    </PanelShell>
  );
}
