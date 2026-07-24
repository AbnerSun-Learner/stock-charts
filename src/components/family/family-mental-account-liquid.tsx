'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Tag, Tooltip } from 'antd';
import { useFamilyAmountVisibility } from '@/components/family/family-amount-visibility';
import { formatCny } from '@/lib/family-finance/format';
import { computeMentalAccountTimeProgress } from '@/lib/family-finance/mental-account';
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
  /** 计入进度的关联账目名称（顺序与关联 id 一致） */
  linkedAccountNames: string[];
  /** 是否展示关联账户行 */
  showLinkedAccounts: boolean;
  height?: number;
}

/**
 * 心理账户水波图：左侧进度（hover 看当前金额），右侧目标、时间进度与可选关联账户。
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
  linkedAccountNames,
  showLinkedAccounts,
  height = 140,
}: FamilyMentalAccountLiquidProps) {
  const percentLabel = formatPercent(progress.chartPercent);
  const amountsVisible = useFamilyAmountVisibility();
  const timePercent = computeMentalAccountTimeProgress(startDate, targetDate);
  const currentAmountLabel = formatCny(progress.current, { visible: amountsVisible });
  const [liquidTipOpen, setLiquidTipOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Tooltip
        open={liquidTipOpen}
        title={`当前金额：${currentAmountLabel}`}
        placement="top"
        mouseEnterDelay={0.05}
      >
        <div
          className="family-mental-account-liquid-chart shrink-0 cursor-default"
          style={{ width: height, height }}
          onMouseEnter={() => setLiquidTipOpen(true)}
          onMouseLeave={() => setLiquidTipOpen(false)}
        >
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
      </Tooltip>
      <dl className="min-w-0 flex-1 space-y-1.5 text-sm m-0">
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-[var(--text-muted)]">目标金额</dt>
          <dd className="family-finance-monetary-value m-0 text-[var(--text)]">
            {formatCny(targetAmount, { visible: amountsVisible })}
          </dd>
        </div>
        {showLinkedAccounts ? (
          <div className="flex items-start justify-between gap-3">
            <dt className="shrink-0 pt-0.5 text-[var(--text-muted)]">关联账户</dt>
            <dd className="m-0 flex max-w-[70%] flex-wrap justify-end gap-1">
              {linkedAccountNames.length === 0 ? (
                <span className="text-[var(--text-muted)]">—</span>
              ) : (
                linkedAccountNames.map((name, index) => (
                  <Tooltip key={`${name}-${index}`} title={name}>
                    <Tag className="m-0 max-w-full truncate">{name}</Tag>
                  </Tooltip>
                ))
              )}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-[var(--text-muted)]">时间进度</dt>
          <dd className="m-0 font-medium text-[var(--text)]">{formatPercent(timePercent)}</dd>
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
