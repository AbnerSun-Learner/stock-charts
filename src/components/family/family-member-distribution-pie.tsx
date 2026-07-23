'use client';

import dynamic from 'next/dynamic';
import type { MemberShare } from '@/types/family-finance';
import { formatCny } from '@/lib/family-finance/format';
import {
  formatMemberPieLabel,
  toMemberPieData,
  type MemberPieDatum,
} from '@/lib/family-finance/member-distribution-pie';

const Pie = dynamic(() => import('@ant-design/charts').then(mod => mod.Pie), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse rounded-lg bg-[var(--bg-muted)]" />,
});

interface FamilyMemberDistributionPieProps {
  shares: MemberShare[];
  height?: number;
}

/**
 * 成员资产分布实心饼图（spider 标签：名 / 金额 / 占比）。
 * @see https://ant-design-charts.antgroup.com/components/plots/pie
 */
export function FamilyMemberDistributionPie({
  shares,
  height = 300,
}: FamilyMemberDistributionPieProps) {
  if (shares.length === 0) return null;

  const data = toMemberPieData(shares);

  return (
    <Pie
      data={data}
      angleField="value"
      colorField="type"
      radius={0.75}
      height={height}
      paddingTop={12}
      paddingBottom={12}
      paddingLeft={24}
      paddingRight={24}
      legend={false}
      label={{
        text: (d: MemberPieDatum) => formatMemberPieLabel(d),
        position: 'spider',
        transform: [{ type: 'overlapDodgeY' }],
      }}
      tooltip={{
        title: (d: MemberPieDatum) => d.type,
        items: [
          {
            field: 'value',
            name: '金额',
            valueFormatter: (v: number) => formatCny(Number(v)),
          },
          {
            field: 'ratio',
            name: '占比',
            valueFormatter: (v: number) => `${Math.round(Number(v) * 100)}%`,
          },
        ],
      }}
      interaction={{ elementHighlight: true }}
    />
  );
}
