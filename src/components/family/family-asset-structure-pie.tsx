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
  height?: number;
}

interface PieLabelDatum {
  type?: string;
  value?: number;
}

/** 外置标签：类别名 + 金额（两行）。 */
function formatStructureLabel(d: PieLabelDatum): string {
  const name = d.type ?? '';
  const amount = formatCny(Number(d.value ?? 0));
  return `${name}\n${amount}`;
}

/**
 * 资产结构饼图：按活钱/稳钱/长钱，外置标签同时展示类别与金额。
 * @see https://ant-design-charts.antgroup.com/examples/case/interactions/#memo
 */
export function FamilyAssetStructurePie({
  shares,
  height = 280,
}: FamilyAssetStructurePieProps) {
  if (shares.length === 0) return null;

  const data = shares.map(s => ({
    type: FOUR_POT_LABELS[s.fourPot],
    value: s.amount,
  }));

  return (
    <Pie
      data={data}
      angleField="value"
      colorField="type"
      height={height}
      paddingLeft={40}
      paddingRight={40}
      scale={{
        color: {
          // 固定 domain，避免缺桶时颜色错位（如仅有稳钱时误用蓝色）
          domain: STRUCTURE_COLOR_DOMAIN,
          range: [...STRUCTURE_COLORS],
        },
      }}
      label={{
        text: formatStructureLabel,
        position: 'outside',
      }}
      legend={{
        color: {
          position: 'bottom',
          layout: { justifyContent: 'center' },
        },
      }}
      tooltip={{
        title: (d: { type?: string }) => d.type ?? '',
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
  );
}
