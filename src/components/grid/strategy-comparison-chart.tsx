"use client";

/**
 * 策略对比折线图组件
 * 展示网格策略 vs 一次性买入的浮亏对比
 * 使用 recharts 实现交互式图表
 */

import { TOOLTIP_Z_INDEX } from "@/components/shared/help-tooltip";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface GridRow {
  position: number;
  buyTriggerPrice: number;
  buyPrice: number;
  buyAmount: number;
  buyShares: number;
  sellTriggerPrice: number;
  sellPrice: number;
  sellShares: number;
  sellAmount: number;
  priceDropRate: number;
}

interface StrategyComparisonChartProps {
  gridData: GridRow[];
  basePrice: number;
  priceDecimals: number;
}

interface ChartDataPoint {
  price: number;
  priceLabel: string;
  lumpSumFloatingLoss: number;
  lumpSumFloatingLossRate: number;
  gridFloatingLoss: number;
  gridFloatingLossRate: number;
  advantage: number;
  lumpSumBuyPrice: number;
  gridAverageCost: number;
  isGridBuyPoint: boolean;
  gridType: string;
  gridBuyAmount: number;
  gridBuyShares: number;
  gridBuyPrice: number;
  gridPosition: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartDataPoint }>;
  colors: {
    tooltipBg: string;
    tooltipBorder: string;
  };
  priceDecimals: number;
}

// 自定义 Tooltip 组件（定义在外部以避免重新创建）
function CustomTooltip({
  active,
  payload,
  colors,
  priceDecimals,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data: ChartDataPoint | undefined = payload[0]?.payload;
  if (!data) return null;

  // 一次全仓死拿的跌幅 = (基准价 - 当前买入价) / 基准价
  const lumpSumDropRate =
    ((data.lumpSumBuyPrice - data.price) / data.lumpSumBuyPrice) * 100;

  // 一次全仓死拿的亏损金额 = 总买入金额 * 跌幅
  // 这里需要从外部获取总买入金额
  const lumpSumLossAmount = data.lumpSumFloatingLoss;

  // 一次全仓死拿的回本需涨 = 跌幅 / (1 - 跌幅)
  const lumpSumBreakEvenRise =
    (lumpSumDropRate / 100 / (1 - lumpSumDropRate / 100)) * 100;

  // 本策略的跌幅 = (基准价 - 平均成本) / 基准价
  const gridDropRate =
    ((data.lumpSumBuyPrice - data.gridAverageCost) / data.lumpSumBuyPrice) *
    100;

  // 本策略的亏损金额
  const gridLossAmount = data.gridFloatingLoss;

  // 本策略的回本需涨 = 跌幅 / (1 - 跌幅)
  const gridBreakEvenRise =
    (gridDropRate / 100 / (1 - gridDropRate / 100)) * 100;

  // 少亏 = 一次全仓死拿亏损金额 - 本策略亏损金额
  const lessLoss = lumpSumLossAmount - gridLossAmount;

  // 回本门槛 = 一次全仓死拿跌幅 - 本策略跌幅
  const breakEvenThreshold = lumpSumDropRate - gridDropRate;

  return (
    <div
      className="p-4 rounded-lg border shadow-xl"
      style={{
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        minWidth: "min(320px, calc(100vw - 2rem))",
        zIndex: TOOLTIP_Z_INDEX,
      }}
    >
      {/* 标题 */}
      <div className="mb-3 pb-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-indigo-600">
            档位 {data.gridPosition.toFixed(2)}
          </span>
        </div>
        <div className="text-sm font-semibold text-slate-800">
          买入触发价 {data.priceLabel}
        </div>
        <div className="text-xs text-slate-600 mt-1">
          买入价 ¥{data.gridBuyPrice.toFixed(priceDecimals)} ·{" "}
          {data.gridBuyShares.toLocaleString()} 股 · ¥
          {data.gridBuyAmount.toLocaleString()}
        </div>
      </div>

      {/* 一次全仓死拿 */}
      <div className="mb-3 space-y-1">
        <div className="text-xs font-medium text-slate-600 flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-500"></div>
          一次全仓死拿
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-red-600">
            -¥{Math.abs(lumpSumLossAmount / 1000).toFixed(1)}k
          </span>
          <span className="text-xs text-slate-500">
            (跌幅 -{Math.abs(lumpSumDropRate).toFixed(1)}%)
          </span>
        </div>
        <div className="text-xs text-slate-600">
          回本需涨{" "}
          <span className="font-semibold text-red-600">
            +{lumpSumBreakEvenRise.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 本策略 */}
      <div className="mb-3 space-y-1">
        <div className="text-xs font-medium text-slate-600 flex items-center gap-1">
          <div className="w-3 h-0.5 bg-green-500"></div>
          本策略
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-green-600">
            -¥{Math.abs(gridLossAmount / 1000).toFixed(1)}k
          </span>
          <span className="text-xs text-slate-500">
            (跌幅 -{Math.abs(gridDropRate).toFixed(1)}%)
          </span>
        </div>
        <div className="text-xs text-slate-600">
          回本需涨{" "}
          <span className="font-semibold text-green-600">
            +{gridBreakEvenRise.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 策略优势 */}
      <div className="pt-3 border-t border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-slate-600 flex items-center gap-1">
            <svg
              className="w-4 h-4 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            策略优势
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="flex items-baseline gap-1">
            <span>少亏</span>
            <span className="font-bold text-green-600">
              ¥{Math.abs(lessLoss / 1000).toFixed(1)}k
            </span>
          </div>
          <span className="text-slate-300">·</span>
          <div className="flex items-baseline gap-1">
            <span>回本门槛</span>
            <span className="font-semibold text-green-600">
              -{Math.abs(breakEvenThreshold).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StrategyComparisonChart({
  gridData,
  basePrice,
  priceDecimals,
}: StrategyComparisonChartProps) {
  const [isCompactChart, setIsCompactChart] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsCompactChart(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  // 计算策略对比数据，以单次遍历累计买入金额和股数，避免随档位增加反复扫描。
  const chartData = useMemo(() => {
    if (gridData.length === 0) return [];

    const totalBuyAmount = gridData.reduce(
      (sum, row) => sum + row.buyAmount,
      0
    );
    const lumpSumBuyPrice = basePrice;
    let gridBoughtAmount = 0;
    let gridBoughtShares = 0;

    const dataPoints: ChartDataPoint[] = gridData.map((row, index) => {
      const price = row.buyPrice;

      // === 一次全仓死拿的计算 ===
      const lumpSumDropRate =
        ((lumpSumBuyPrice - price) / lumpSumBuyPrice) * 100;
      const lumpSumFloatingLoss = totalBuyAmount * (lumpSumDropRate / 100);
      const lumpSumFloatingLossRate = -Math.abs(lumpSumDropRate);

      // === 本策略的计算（累计到当前档位） ===
      gridBoughtAmount += row.buyAmount;
      gridBoughtShares += row.buyShares;

      // 平均成本 = 总买入金额 / 总买入股数
      const gridAverageCost = gridBoughtAmount / gridBoughtShares;

      // 本策略跌幅 = (基准价 - 平均成本) / 基准价
      const gridDropRate = ((basePrice - gridAverageCost) / basePrice) * 100;

      // 本策略亏损金额 = 总买入金额 * 跌幅
      const gridFloatingLoss = gridBoughtAmount * (gridDropRate / 100);
      // Y轴显示为负数（跌幅为负）
      const gridFloatingLossRate = -Math.abs(gridDropRate);

      return {
        price,
        priceLabel: `¥${price.toFixed(priceDecimals)}`,
        lumpSumFloatingLoss,
        lumpSumFloatingLossRate,
        gridFloatingLoss,
        gridFloatingLossRate,
        advantage: lumpSumFloatingLoss - gridFloatingLoss,
        lumpSumBuyPrice,
        gridAverageCost,
        isGridBuyPoint: true,
        gridType: "",
        gridBuyAmount: row.buyAmount,
        gridBuyShares: row.buyShares,
        gridBuyPrice: row.buyPrice,
        gridPosition: row.position,
      };
    });

    return dataPoints;
  }, [gridData, basePrice, priceDecimals]);

  if (chartData.length === 0) return null;

  // 专业金融配色方案
  const colors = {
    lumpSum: "#ef4444",
    grid: "#10b981",
    primary: "#0066cc",
    accent: "#ff6b35",
    text: "#1a1a1a",
    textLight: "#6b7280",
    gridLine: "#e5e7eb",
    background: "#fafafa",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e5e7eb",
    buyPoint: "#3b82f6",
    buyPointBorder: "#60a5fa",
  };

  const chartMargin = isCompactChart
    ? { top: 16, right: 12, left: 0, bottom: 48 }
    : { top: 20, right: 30, left: 20, bottom: 60 };
  const xAxisTick = isCompactChart
    ? { fill: colors.textLight, fontSize: 10 }
    : { fill: colors.textLight, fontSize: 12 };
  const yAxisTick = isCompactChart
    ? { fill: colors.textLight, fontSize: 10 }
    : { fill: colors.textLight, fontSize: 12 };

  // 格式化 Y 轴 - 百分比显示（负数格式）
  function formatYAxis(value: number) {
    if (value === 0) return "0%";
    return `${value.toFixed(0)}%`;
  }

  return (
    <div className="w-full">
      {/* 标题 */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800">
          策略优势推演（抗跌能力）
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          模拟单边下跌行情：对比 一次全仓死拿 与 本策略 的浮亏差距
        </p>
      </div>

      {/* 图表 */}
      <div className="h-[280px] sm:h-[350px] md:h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={chartMargin}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.gridLine}
              opacity={0.3}
            />
            <XAxis
              dataKey="priceLabel"
              stroke={colors.textLight}
              tick={xAxisTick}
              {...(isCompactChart
                ? {
                    angle: -35,
                    textAnchor: "end" as const,
                    height: 50,
                    interval: "preserveStartEnd" as const,
                  }
                : { tickCount: 6 })}
              label={{
                value: "股价",
                position: "insideBottom",
                offset: -10,
                style: { fill: colors.text, fontSize: 14, fontWeight: 500 },
              }}
            />
            <YAxis
              stroke={colors.textLight}
              tick={yAxisTick}
              width={isCompactChart ? 40 : undefined}
              tickFormatter={formatYAxis}
              domain={[(dataMin: number) => Math.floor(dataMin * 1.1), 0]}
              label={{
                value: "浮动盈亏（%）",
                angle: -90,
                position: "insideLeft",
                style: { fill: colors.text, fontSize: 14, fontWeight: 500 },
              }}
            />
            <Tooltip
              content={(props) => (
                <CustomTooltip
                  {...props}
                  active={true}
                  colors={colors}
                  priceDecimals={priceDecimals}
                />
              )}
              wrapperStyle={{ zIndex: TOOLTIP_Z_INDEX }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: "20px",
                fontSize: "14px",
              }}
              iconType="line"
            />

            {/* 一次全仓死拿线 */}
            <Line
              type="linear"
              dataKey="lumpSumFloatingLossRate"
              stroke={colors.lumpSum}
              strokeWidth={1}
              strokeDasharray="8 4"
              dot={false}
              name="一次全仓死拿"
              activeDot={{ r: 6 }}
            />

            {/* 本策略线 - 所有点都是买入点 */}
            <Line
              type="linear"
              dataKey="gridFloatingLossRate"
              stroke={colors.grid}
              strokeWidth={2}
              name="本策略"
              dot={(props: {
                cx?: number;
                cy?: number;
                payload?: ChartDataPoint;
              }) => {
                const { cx = 0, cy = 0 } = props;

                return (
                  <g>
                    {/* 外圈边框 - 浅蓝色 */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill={colors.buyPointBorder}
                      opacity={0.5}
                    />
                    {/* 主圆点 - 蓝色 */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill={colors.buyPoint}
                      stroke="#ffffff"
                      strokeWidth={2}
                      style={{ cursor: "pointer" }}
                    />
                  </g>
                );
              }}
              activeDot={{
                r: 8,
                fill: colors.buyPoint,
                stroke: "#ffffff",
                strokeWidth: 3,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
