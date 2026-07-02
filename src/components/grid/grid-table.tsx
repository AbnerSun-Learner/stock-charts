"use client";

import { HelpTooltip } from "@/components/shared/help-tooltip";
import type { GridRow } from "@/types/grid";
import { useMemo } from "react";

interface GridTableProps {
  gridData: GridRow[];
  priceDecimals: number;
}

function getGridRowKey(row: GridRow): string {
  return [
    row.gridType,
    row.position,
    row.buyPrice,
    row.sellPrice,
    row.buyShares,
    row.sellShares,
  ].join("-");
}

const GRID_TYPE_META = {
  小网: "bg-[color-mix(in_srgb,var(--muted-foreground)_12%,var(--card))] text-[var(--foreground)] ring-1 ring-[var(--border)]",
  中网: "bg-[color-mix(in_srgb,var(--accent)_9%,var(--card))] text-[var(--foreground)] ring-1 ring-[color-mix(in_srgb,var(--accent)_22%,var(--border))]",
  大网: "bg-[color-mix(in_srgb,var(--accent)_15%,var(--card))] text-[var(--foreground)] ring-1 ring-[color-mix(in_srgb,var(--accent)_30%,var(--border))]",
} satisfies Record<GridRow["gridType"], string>;

export function GridTable({ gridData, priceDecimals }: GridTableProps) {
  const { sortedData, firstPositionByType } = useMemo(() => {
    const data = [...gridData].sort((a, b) => b.position - a.position);
    const firstByType = new Map<string, number>();
    data.forEach(row => {
      if (!firstByType.has(row.gridType)) {
        firstByType.set(row.gridType, row.position);
      }
    });
    return { sortedData: data, firstPositionByType: firstByType };
  }, [gridData]);

  return (
    <div
      className="overflow-x-auto rounded-xl border border-[var(--border)] shadow-[var(--ds-shadow-sm)] [-webkit-overflow-scrolling:touch]"
      aria-label="网格结果表，可横向滚动"
    >
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)]">
            {[
              { label: "类型" },
              { label: "档位" },
              { label: "买入价" },
              {
                label: "跌幅",
                tooltip: "相对于上一档位的跌幅",
              },
              { label: "买入金额" },
              { label: "买入股数" },
              { label: "卖出价" },
              { label: "卖出股数" },
              { label: "卖出金额" },
            ].map((col) => (
              <th
                key={col.label}
                className="p-2 sm:p-4 text-left text-[10px] font-medium uppercase text-[var(--muted-foreground)] whitespace-nowrap"
                style={{ letterSpacing: "0.08em" }}
              >
                {col.tooltip ? (
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    <HelpTooltip
                      title={col.tooltip}
                      placement="bottomLeft"
                      maxWidth="12rem"
                    />
                  </div>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => {
            const isFirstPosition =
              (row.gridType === "中网" || row.gridType === "大网") &&
              firstPositionByType.get(row.gridType) === row.position;

            const displayDropRate =
              isFirstPosition && row.priceDropRate > 0
                ? -row.priceDropRate
                : row.priceDropRate;

            const typeMeta = GRID_TYPE_META[row.gridType];

            return (
              <tr
                key={getGridRowKey(row)}
                className="border-b border-[var(--border)] transition-colors duration-200 last:border-b-0 hover:bg-[var(--hover-bg)]"
              >
                <td className="p-2 sm:p-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${typeMeta}`}
                  >
                    {row.gridType}
                  </span>
                </td>
                <td className="p-2 sm:p-4 text-sm text-[var(--foreground)] whitespace-nowrap">
                  {row.position.toFixed(2)}
                </td>
                <td className="p-2 sm:p-4 text-sm text-[var(--foreground)] whitespace-nowrap">
                  {row.buyPrice.toFixed(priceDecimals)}
                </td>
                <td
                  className="p-2 sm:p-4 text-sm font-medium whitespace-nowrap"
                  style={{
                    color:
                      displayDropRate < 0 ? "var(--loss)" : "var(--foreground)",
                  }}
                >
                  {displayDropRate === 0
                    ? "—"
                    : `${displayDropRate.toFixed(2)}%`}
                </td>
                <td className="p-2 sm:p-4 text-sm text-[var(--foreground)] whitespace-nowrap">
                  {row.buyAmount.toLocaleString()}
                </td>
                <td className="p-2 sm:p-4 text-sm text-[var(--foreground)] whitespace-nowrap">
                  {row.buyShares.toLocaleString()}
                </td>
                <td className="p-2 sm:p-4 text-sm text-[var(--foreground)] whitespace-nowrap">
                  {row.sellPrice.toFixed(priceDecimals)}
                </td>
                <td className="p-2 sm:p-4 text-sm text-[var(--foreground)] whitespace-nowrap">
                  {row.sellShares.toLocaleString()}
                </td>
                <td className="p-2 sm:p-4 text-sm text-[var(--foreground)] whitespace-nowrap">
                  {row.sellAmount.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
