import type { GridRow } from '@/types/grid';

/**
 * 策略对比图单个数据点：某一买入档位上「一次全仓死拿」与「本策略」的浮亏对比。
 */
export interface StrategyComparisonPoint {
  price: number;
  priceLabel: string;
  lumpSumFloatingLoss: number;
  lumpSumFloatingLossRate: number;
  gridFloatingLoss: number;
  gridFloatingLossRate: number;
  advantage: number;
  lumpSumBuyPrice: number;
  gridAverageCost: number;
  gridBuyAmount: number;
  gridBuyShares: number;
  gridBuyPrice: number;
  gridPosition: number;
}

/**
 * Tooltip 展示所需的派生指标。
 */
export interface StrategyTooltipMetrics {
  lumpSumDropRate: number;
  lumpSumLossAmount: number;
  lumpSumBreakEvenRise: number;
  gridDropRate: number;
  gridLossAmount: number;
  gridBreakEvenRise: number;
  lessLoss: number;
  breakEvenThreshold: number;
}

/**
 * 回本需涨幅 = 跌幅 / (1 - 跌幅)。跌幅 >= 100% 时无法回本，返回 Infinity。
 */
export function computeBreakEvenRise(dropRatePercent: number): number {
  const drop = dropRatePercent / 100;
  if (drop >= 1) return Number.POSITIVE_INFINITY;
  return (drop / (1 - drop)) * 100;
}

/**
 * 构建策略对比图数据：以单次遍历累计买入金额和股数，
 * 逐档对比「一次全仓死拿」与「本策略（网格分批买入）」的浮亏。
 */
export function buildStrategyComparisonData(
  gridData: GridRow[],
  basePrice: number,
  priceDecimals: number
): StrategyComparisonPoint[] {
  if (gridData.length === 0 || basePrice <= 0) return [];

  const totalBuyAmount = gridData.reduce((sum, row) => sum + row.buyAmount, 0);
  const lumpSumBuyPrice = basePrice;
  let gridBoughtAmount = 0;
  let gridBoughtShares = 0;

  const dataPoints: StrategyComparisonPoint[] = [];

  for (const row of gridData) {
    // 防御：0 股档位无法计算平均成本，直接跳过
    if (row.buyShares <= 0) continue;

    const price = row.buyPrice;

    // 一次全仓死拿：跌幅与浮亏
    const lumpSumDropRate = ((lumpSumBuyPrice - price) / lumpSumBuyPrice) * 100;
    const lumpSumFloatingLoss = totalBuyAmount * (lumpSumDropRate / 100);
    const lumpSumFloatingLossRate = -Math.abs(lumpSumDropRate);

    // 本策略：累计到当前档位的平均成本与浮亏
    gridBoughtAmount += row.buyAmount;
    gridBoughtShares += row.buyShares;
    const gridAverageCost = gridBoughtAmount / gridBoughtShares;
    const gridDropRate = ((basePrice - gridAverageCost) / basePrice) * 100;
    const gridFloatingLoss = gridBoughtAmount * (gridDropRate / 100);
    const gridFloatingLossRate = -Math.abs(gridDropRate);

    dataPoints.push({
      price,
      priceLabel: `¥${price.toFixed(priceDecimals)}`,
      lumpSumFloatingLoss,
      lumpSumFloatingLossRate,
      gridFloatingLoss,
      gridFloatingLossRate,
      advantage: lumpSumFloatingLoss - gridFloatingLoss,
      lumpSumBuyPrice,
      gridAverageCost,
      gridBuyAmount: row.buyAmount,
      gridBuyShares: row.buyShares,
      gridBuyPrice: row.buyPrice,
      gridPosition: row.position,
    });
  }

  return dataPoints;
}

/**
 * 由数据点计算 Tooltip 派生指标（跌幅、回本需涨、少亏、回本门槛）。
 */
export function computeTooltipMetrics(
  point: StrategyComparisonPoint
): StrategyTooltipMetrics {
  const lumpSumDropRate =
    ((point.lumpSumBuyPrice - point.price) / point.lumpSumBuyPrice) * 100;
  const gridDropRate =
    ((point.lumpSumBuyPrice - point.gridAverageCost) / point.lumpSumBuyPrice) *
    100;

  return {
    lumpSumDropRate,
    lumpSumLossAmount: point.lumpSumFloatingLoss,
    lumpSumBreakEvenRise: computeBreakEvenRise(lumpSumDropRate),
    gridDropRate,
    gridLossAmount: point.gridFloatingLoss,
    gridBreakEvenRise: computeBreakEvenRise(gridDropRate),
    lessLoss: point.lumpSumFloatingLoss - point.gridFloatingLoss,
    breakEvenThreshold: lumpSumDropRate - gridDropRate,
  };
}
