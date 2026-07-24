'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { formatCny } from '@/lib/family-finance/format';
import type { MentalGoalPriorityAggregate } from '@/types/family-finance';

const Column = dynamic(() => import('@ant-design/charts').then(mod => mod.Column), {
  ssr: false,
  loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-[var(--bg-muted)]" />,
});

const BAR_COLORS = ['#0052ff', '#7c828a'] as const;

interface FamilyMentalGoalsBarChartProps {
  aggregates: MentalGoalPriorityAggregate[];
  height?: number;
}

interface MentalGoalBarRow {
  priority: string;
  type: '目标合计' | '已达成';
  amount: number;
}

function formatCompactAmount(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * 心理账户目标总览：按 P0/P1/P2 分组柱对比目标合计与已达成。
 */
export function FamilyMentalGoalsBarChart({
  aggregates,
  height = 280,
}: FamilyMentalGoalsBarChartProps) {
  const data = useMemo<MentalGoalBarRow[]>(
    () =>
      aggregates.flatMap(row => [
        { priority: row.priority, type: '目标合计' as const, amount: row.targetSum },
        { priority: row.priority, type: '已达成' as const, amount: row.currentSum },
      ]),
    [aggregates]
  );

  const completionByPriority = useMemo(() => {
    const map = new Map<string, { targetSum: number; currentSum: number }>();
    for (const row of aggregates) {
      map.set(row.priority, { targetSum: row.targetSum, currentSum: row.currentSum });
    }
    return map;
  }, [aggregates]);

  return (
    <Column
      data={data}
      xField="priority"
      yField="amount"
      colorField="type"
      group
      height={height}
      autoFit
      scale={{
        color: { range: [...BAR_COLORS] },
      }}
      axis={{
        y: {
          labelFormatter: (value: number) => formatCompactAmount(value),
        },
      }}
      tooltip={{
        items: [
          (datum: MentalGoalBarRow) => {
            const stats = completionByPriority.get(datum.priority);
            const rate =
              stats && stats.targetSum > 0
                ? `${((stats.currentSum / stats.targetSum) * 100).toFixed(1)}%`
                : '—';
            return {
              name: datum.type,
              value: `${formatCny(datum.amount)}（完成率 ${rate}）`,
            };
          },
        ],
      }}
      legend={{ position: 'top' }}
    />
  );
}
