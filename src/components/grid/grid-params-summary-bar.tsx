'use client';

import type { GridBudgetMode } from '@/types/grid-v2';
import { GridSaveStatusIsland } from '@/components/grid/grid-save-status-island';
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
  saveLabel: '保存策略' | '更新策略' | '已保存';
  saveDisabled: boolean;
  saveLoading: boolean;
  saveReason: string | null;
  onSave: () => void;
}

/**
 * 结果态顶部参数摘要条（sticky）+ 保存状态岛 +「修改参数」。
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
  saveLabel,
  saveDisabled,
  saveLoading,
  saveReason,
  onSave,
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
      <div className="grid-summary-bar__actions">
        <GridSaveStatusIsland
          label={saveLabel}
          disabled={saveDisabled}
          loading={saveLoading}
          reason={saveReason}
          onSave={onSave}
        />
        <Button type="default" shape="round" onClick={onEdit}>
          修改参数
        </Button>
      </div>
    </div>
  );
}
