'use client';

import type { GridBudgetMode } from '@/types/grid-v2';
import { Button } from 'antd';

interface GridParamsSummaryBarProps {
  basePrice: number;
  minPrice: number;
  totalBudget: number;
  amountPerGrid: number;
  budgetMode: GridBudgetMode;
  gridCount: number;
  priceDecimals: number;
  onEdit: () => void;
}

/**
 * 结果态顶部参数摘要条（sticky）+「修改参数」。
 */
export function GridParamsSummaryBar({
  basePrice,
  minPrice,
  totalBudget,
  amountPerGrid,
  budgetMode,
  gridCount,
  priceDecimals,
  onEdit,
}: GridParamsSummaryBarProps) {
  const budgetLabel = budgetMode === 'auto' ? '总弹药' : '单格金额';
  const budgetValue =
    budgetMode === 'auto' ? totalBudget : amountPerGrid;

  return (
    <div className="grid-summary-bar">
      <div className="grid-summary-bar__meta">
        <span>
          基准价{' '}
          <strong>{basePrice.toFixed(priceDecimals)}</strong>
        </span>
        <span>
          最低价{' '}
          <strong>{minPrice.toFixed(priceDecimals)}</strong>
        </span>
        <span>
          {budgetLabel}{' '}
          <strong>{budgetValue.toLocaleString()}</strong>
        </span>
        <span>
          档位 <strong>{gridCount}</strong>
        </span>
      </div>
      <Button type="default" shape="round" onClick={onEdit}>
        修改参数
      </Button>
    </div>
  );
}
