'use client';

import type { GridBudgetMode } from '@/types/grid-v2';
import { Button, Tooltip } from 'antd';

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
 * 结果态顶部参数摘要条（sticky）+ 保存/更新 +「修改参数」。
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

  const saveButton = (
    <Button
      type="primary"
      shape="round"
      loading={saveLoading}
      disabled={saveDisabled || saveLoading}
      onClick={onSave}
      className="grid-summary-bar__save"
    >
      {saveLabel}
    </Button>
  );

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
        {saveReason ? (
          <Tooltip title={saveReason}>
            <span className="grid-summary-bar__save-wrap">{saveButton}</span>
          </Tooltip>
        ) : (
          saveButton
        )}
        {saveReason ? (
          <span className="grid-summary-bar__reason">{saveReason}</span>
        ) : null}
        <Button type="default" shape="round" onClick={onEdit}>
          修改参数
        </Button>
      </div>
    </div>
  );
}
