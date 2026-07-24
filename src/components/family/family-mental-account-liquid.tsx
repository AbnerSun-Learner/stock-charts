'use client';

import dynamic from 'next/dynamic';
import { useFamilyAmountVisibility } from '@/components/family/family-amount-visibility';
import { formatCny } from '@/lib/family-finance/format';
import type { MentalAccountProgress } from '@/types/family-finance';

const Liquid = dynamic(() => import('@ant-design/charts').then(mod => mod.Liquid), {
  ssr: false,
  loading: () => <div className="h-[140px] animate-pulse rounded-lg bg-[var(--bg-muted)]" />,
});

/** 与资产结构图「活钱」色一致。 */
const LIQUID_COLOR = '#2563eb';

interface FamilyMentalAccountLiquidProps {
  progress: MentalAccountProgress;
  targetAmount: number;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  targetDate: string;
  height?: number;
}

/**
 * 心理账户水波图：左侧进度，右侧带中文标签的金额与日期。
 * @see https://ant-design-charts.antgroup.com/examples/statistics/liquid/#liquid
 */
function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}

export function FamilyMentalAccountLiquid({
  progress,
  targetAmount,
  startDate,
  targetDate,
  height = 140,
}: FamilyMentalAccountLiquidProps) {
  const percentLabel = formatPercent(progress.chartPercent);
  const amountsVisible = useFamilyAmountVisibility();

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="shrink-0">
        <Liquid
          percent={progress.chartPercent}
          height={height}
          width={height}
          autoFit={false}
          style={{
            outlineBorder: 1.5,
            outlineDistance: 2,
            waveLength: 80,
            textFill: LIQUID_COLOR,
            fill: LIQUID_COLOR,
            // 覆盖 G2 默认 prettyNumber（最多 10 位小数）
            contentText: percentLabel,
          }}
          interaction={{ tooltip: false }}
        />
      </div>
      <dl className="min-w-0 flex-1 space-y-1.5 text-sm m-0">
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-[var(--text-muted)]">完成进度</dt>
          <dd className="m-0 font-medium text-[var(--text)]">{percentLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-[var(--text-muted)]">当前金额</dt>
          <dd className="family-finance-monetary-value m-0 text-[var(--text)]">
            {formatCny(progress.current, { visible: amountsVisible })}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-[var(--text-muted)]">目标金额</dt>
          <dd className="family-finance-monetary-value m-0 text-[var(--text)]">
            {formatCny(targetAmount, { visible: amountsVisible })}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-[var(--text-muted)]">开始日期</dt>
          <dd className="m-0 text-[var(--text)]">{startDate}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-[var(--text-muted)]">预期达成</dt>
          <dd className="m-0 text-[var(--text)]">{targetDate}</dd>
        </div>
        {progress.overflow > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-[var(--text-muted)]">已超额</dt>
            <dd className="family-finance-monetary-value m-0 text-[var(--text)]">
              {formatCny(progress.overflow, { visible: amountsVisible })}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
