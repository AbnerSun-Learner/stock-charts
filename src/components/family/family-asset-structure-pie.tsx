'use client';

import dynamic from 'next/dynamic';
import {
  FOUR_POT_LABELS,
  STRUCTURE_FOUR_POTS,
  type FourPotShare,
} from '@/types/family-finance';
import { formatCny } from '@/lib/family-finance/format';

const Pie = dynamic(() => import('@ant-design/charts').then(mod => mod.Pie), {
  ssr: false,
  loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-[var(--bg-muted)]" />,
});

/** 活钱 / 稳钱 / 长钱 固定配色（与 STRUCTURE_FOUR_POTS 顺序一致）。 */
const STRUCTURE_COLORS = ['#2563eb', '#10b981', '#f59e0b'] as const;

const STRUCTURE_COLOR_DOMAIN = STRUCTURE_FOUR_POTS.map(pot => FOUR_POT_LABELS[pot]);

interface FamilyAssetStructurePieProps {
  shares: FourPotShare[];
  totalAssets: number;
  height?: number;
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('zh-CN', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * 资产结构环图：按活钱/稳钱/长钱，右侧标签同时展示类别与金额。
 * @see https://ant-design-charts.antgroup.com/examples/statistics/pie/#basic-donut
 */
export function FamilyAssetStructurePie({
  shares,
  totalAssets,
  height = 280,
}: FamilyAssetStructurePieProps) {
  if (shares.length === 0) return null;

  const data = shares.map(s => ({
    type: FOUR_POT_LABELS[s.fourPot],
    value: s.amount,
    totalAssetRatio: totalAssets > 0 ? s.amount / totalAssets : null,
  }));

  return (
    <div className="family-asset-structure-chart flex w-full flex-col items-center justify-center gap-5 sm:flex-row">
      <div className="min-w-0 flex-1">
        <Pie
          data={data}
          angleField="value"
          colorField="type"
          radius={0.96}
          innerRadius={0.6}
          height={height}
          paddingLeft={8}
          paddingRight={8}
          scale={{
            color: {
              // 固定 domain，避免缺桶时颜色错位（如仅有稳钱时误用蓝色）
              domain: STRUCTURE_COLOR_DOMAIN,
              range: [...STRUCTURE_COLORS],
            },
          }}
          label={false}
          legend={false}
          tooltip={{
            title: (d: { type?: string; totalAssetRatio?: number | null }) =>
              `${d.type ?? ''} ${formatPercent(d.totalAssetRatio ?? null)}`.trim(),
            items: [
              {
                field: 'value',
                name: '金额',
                valueFormatter: (v: number) => formatCny(Number(v)),
              },
            ],
          }}
          interaction={{ elementHighlight: true }}
        />
      </div>

      <div className="shrink-0 space-y-3" aria-label="资产结构标签">
        {shares.map(share => {
          const color = STRUCTURE_COLORS[STRUCTURE_FOUR_POTS.indexOf(share.fourPot)];
          const totalAssetRatio =
            totalAssets > 0 ? share.amount / totalAssets : null;
          return (
            <div key={share.fourPot} className="flex items-start gap-2">
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <div>
                <div className="flex items-baseline gap-1.5 text-sm text-[var(--text-secondary)]">
                  <span>{FOUR_POT_LABELS[share.fourPot]}</span>
                  <span className="text-xs tabular-nums text-[var(--text-muted)]">
                    {formatPercent(totalAssetRatio)}
                  </span>
                </div>
                <div className="family-finance-monetary-value text-sm font-medium text-[var(--text-primary)]">
                  {formatCny(share.amount)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
