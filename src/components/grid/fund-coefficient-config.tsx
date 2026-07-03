"use client";

import { HelpTooltip } from "@/components/shared/help-tooltip";
import type { GridBudgetMode } from "@/types/grid-v2";
import { InputNumber, Segmented } from "antd";

interface FundCoefficientConfigProps {
  totalBudget: number;
  onTotalBudgetChange: (value: number | null) => void;
  budgetMode: GridBudgetMode;
  onBudgetModeChange: (mode: GridBudgetMode) => void;
  amountPerGrid: number;
  onAmountPerGridChange: (value: number | null) => void;
  amountMultiplier: number;
  onAmountMultiplierChange: (value: number | null) => void;
  profitReserveMultiplier: number;
  onProfitReserveMultiplierChange: (value: number | null) => void;
}

export function FundCoefficientConfig({
  totalBudget,
  onTotalBudgetChange,
  budgetMode,
  onBudgetModeChange,
  amountPerGrid,
  onAmountPerGridChange,
  amountMultiplier,
  onAmountMultiplierChange,
  profitReserveMultiplier,
  onProfitReserveMultiplierChange,
}: FundCoefficientConfigProps) {
  return (
    <div className="space-y-4 p-4 sm:p-6 md:p-7">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="ds-card-eyebrow mb-1.5">Capital</p>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              资金系数
            </h3>
            <HelpTooltip
              size="md"
              placement="bottomLeft"
              maxWidth="16rem"
              title="总弹药反推单格金额，支持越跌越买与留利底仓"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="totalBudget"
            className="flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]"
          >
            <span className="text-[var(--loss)]">*</span>
            总弹药
            <HelpTooltip
              title="愿意投入网格的最大现金，系统将反推单格基础金额"
              placement="topLeft"
              maxWidth="14rem"
            />
          </label>
          <InputNumber
            id="totalBudget"
            value={totalBudget}
            onChange={onTotalBudgetChange}
            precision={0}
            min={1000}
            controls={false}
            className="w-full"
            style={{
              width: "100%",
              textAlign: "center",
              fontWeight: 600,
              fontSize: "16px",
            }}
          />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-[var(--foreground)]">
            预算模式
          </span>
          <Segmented
            block
            value={budgetMode}
            onChange={value => onBudgetModeChange(value as GridBudgetMode)}
            options={[
              { label: "自动反推", value: "auto" },
              { label: "手动金额", value: "manual" },
            ]}
          />
        </div>

        {budgetMode === "manual" && (
          <div className="space-y-2">
            <label
              htmlFor="amountPerGrid"
              className="flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]"
            >
              <span className="text-[var(--loss)]">*</span>
              每份金额
            </label>
            <InputNumber
              id="amountPerGrid"
              value={amountPerGrid}
              onChange={onAmountPerGridChange}
              precision={0}
              min={100}
              controls={false}
              className="w-full"
              style={{
                width: "100%",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "16px",
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="amountMultiplier"
              className="flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]"
            >
              <span className="text-[var(--loss)]">*</span>
              金额加码系数
            </label>
            <InputNumber
              id="amountMultiplier"
              value={amountMultiplier}
              onChange={onAmountMultiplierChange}
              precision={1}
              min={0}
              controls={false}
              className="w-full"
              style={{
                width: "100%",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "16px",
              }}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="profitReserveMultiplier"
              className="flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]"
            >
              <span className="text-[var(--loss)]">*</span>
              保留利润系数
            </label>
            <InputNumber
              id="profitReserveMultiplier"
              value={profitReserveMultiplier}
              onChange={onProfitReserveMultiplierChange}
              precision={1}
              min={0}
              controls={false}
              className="w-full"
              style={{
                width: "100%",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "16px",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
