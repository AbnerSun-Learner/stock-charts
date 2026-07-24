'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import dynamic from 'next/dynamic';
import { Card, Empty, Segmented } from 'antd';
import {
  filterBalanceSnapshots,
  shanghaiTodayIso,
  toBalanceTrendSeries,
} from '@/lib/family-finance/balance-trend';
import { formatCompactCny, formatCny } from '@/lib/family-finance/format';
import { useFamilyAmountVisibility } from '@/components/family/family-amount-visibility';
import {
  BALANCE_TREND_TYPES,
  type BalanceTrendPoint,
  type BalanceTrendRange,
  type FamilyBalanceSnapshot,
} from '@/types/family-finance';

const Line = dynamic(() => import('@ant-design/charts').then(mod => mod.Line), {
  ssr: false,
  loading: () => <div className="h-full min-h-[220px] animate-pulse rounded-lg bg-[var(--bg-muted)]" />,
});

const RANGE_OPTIONS: { label: string; value: BalanceTrendRange }[] = [
  { label: '近90天', value: '90d' },
  { label: '近1年', value: '1y' },
  { label: '全部', value: 'all' },
];

const TREND_COLORS = ['#0052ff', '#7c828a', '#05b169'] as const;

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
});

function formatTrendDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00+08:00`));
}

/** 跟踪容器高度，使折线填满 KPI 行拉伸后的卡片。 */
function useContainerHeight(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setHeight(Math.max(0, Math.floor(el.getBoundingClientRect().height)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, height];
}

interface FamilyBalanceTrendChartProps {
  points: FamilyBalanceSnapshot[];
  loading: boolean;
}

/**
 * 总览 KPI 区资产负债趋势：可切换时间范围，图例可显示净资产。
 * 卡片高度随左侧三张 KPI 拉伸对齐，折线区域自适应填满。
 */
export function FamilyBalanceTrendChart({
  points,
  loading,
}: FamilyBalanceTrendChartProps) {
  const [range, setRange] = useState<BalanceTrendRange>('90d');
  const asOfDate = useMemo(() => shanghaiTodayIso(), []);
  const [chartBodyRef, chartHeight] = useContainerHeight();
  const amountsVisible = useFamilyAmountVisibility();

  const filtered = useMemo(
    () => filterBalanceSnapshots(points, range, asOfDate),
    [points, range, asOfDate]
  );
  const series = useMemo(() => toBalanceTrendSeries(filtered), [filtered]);

  const emptyDescription =
    points.length === 0
      ? '暂无历史趋势，更新资产后将按日累计'
      : '该范围内暂无数据';

  return (
    <Card
      loading={loading}
      className="family-finance-section-card family-balance-trend-card"
      title={
        <div className="family-balance-trend-card__header">
          <h2 className="family-finance-section__title">资产负债趋势</h2>
          <Segmented
            size="small"
            value={range}
            options={RANGE_OPTIONS}
            onChange={value => setRange(value as BalanceTrendRange)}
          />
        </div>
      }
    >
      <div ref={chartBodyRef} className="family-balance-trend-chart-body">
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />
          </div>
        ) : (
          <Line
            data={series}
            xField="date"
            yField="amount"
            colorField="type"
            // ResizeObserver 未就绪时用兜底高度，避免 flex 塌缩导致图不渲染
            height={Math.max(chartHeight, 280)}
            autoFit
            paddingLeft={56}
            paddingRight={16}
            scale={{
              y: { nice: true },
              color: {
                domain: [...BALANCE_TREND_TYPES],
                range: [...TREND_COLORS],
              },
            }}
            axis={{
              x: { title: false, labelFormatter: formatTrendDate },
              y: {
                title: false,
                labelFormatter: (value: number) =>
                  formatCompactCny(Number(value), { visible: amountsVisible }),
              },
            }}
            style={{ lineWidth: 2 }}
            point={{
              size: 3,
              style: { fill: '#fff', lineWidth: 2 },
            }}
            legend={{
              color: {
                position: 'bottom',
                layout: { justifyContent: 'center' },
                // G2 v5：初始仅选中总资产/总负债；净资产靠图例点选显示
                defaultSelect: ['总资产', '总负债'],
              },
            }}
            tooltip={{
              title: (datum: BalanceTrendPoint) => datum.date,
              items: [
                (datum: BalanceTrendPoint) => ({
                  name: datum.type,
                  value: formatCny(datum.amount, { visible: amountsVisible }),
                }),
              ],
            }}
          />
        )}
      </div>
    </Card>
  );
}
