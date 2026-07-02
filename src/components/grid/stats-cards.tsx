"use client";

import { HelpTooltip } from "@/components/shared/help-tooltip";
import type { StressTest } from "@/types/grid";

interface StatsCardsProps {
  stressTest: StressTest;
}

export function StatsCards({ stressTest }: StatsCardsProps) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {[
        {
          label: "总买入金额",
          value: stressTest.totalBuyAmount.toLocaleString(),
          color: null,
          tooltip: null,
        },
        {
          label: "总卖出金额",
          value: stressTest.totalSellAmount.toLocaleString(),
          color: null,
          tooltip: null,
        },
        {
          label: "剩余股数",
          value: stressTest.remainingShares.toLocaleString(),
          color: null,
          tooltip: "剩余股数 = 总买入股数 - 总卖出股数",
        },
        {
          label: "预期利润",
          value:
            (stressTest.profit > 0 ? "+" : "") +
            stressTest.profit.toLocaleString(),
          color:
            stressTest.profit > 0
              ? "var(--profit)"
              : stressTest.profit < 0
              ? "var(--loss)"
              : null,
          tooltip: "利润 = 卖出金额 - 买入金额 + 剩余股数 × 基准价",
        },
        {
          label: "收益率",
          value:
            (stressTest.profitRate > 0 ? "+" : "") +
            stressTest.profitRate +
            "%",
          color:
            stressTest.profitRate > 0
              ? "var(--profit)"
              : stressTest.profitRate < 0
              ? "var(--loss)"
              : null,
          tooltip: "利润 / 买入金额 × 100",
        },
      ].map((item, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-subtle)_55%,var(--card))] p-4 shadow-[var(--ds-shadow-sm)] transition-[box-shadow,transform] duration-200 hover:shadow-[var(--ds-shadow-md)] md:p-5"
        >
          <div className="mb-3 flex items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              {item.label}
            </span>
            {item.tooltip && (
              <HelpTooltip
                title={item.tooltip}
                placement="topLeft"
                maxWidth="13rem"
              />
            )}
          </div>
          <div
            className="text-xl font-light"
            style={{
              color: item.color ?? "var(--foreground)",
              letterSpacing: "-0.01em",
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
