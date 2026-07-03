import type {
  AggregatedGridRow,
  GridLeg,
  GridStrategyParamsV2,
  StressTestV2,
} from '@/types/grid-v2';
import {
  calculateCostCoverageStepPct,
  extractTradeCost,
} from '@/lib/grid/trade-cost';

/**
 * 从 legs 与聚合行计算压力测试 V2。
 */
export function computeStressTestV2(
  params: GridStrategyParamsV2,
  amountPerGrid: number,
  legs: GridLeg[],
  aggregatedRows: AggregatedGridRow[],
  valuationPrice: number = params.basePrice
): StressTestV2 {
  const cost = extractTradeCost(params);
  const totalBudgetRequired = legs.reduce(
    (sum, leg) => sum + leg.actualBuyAmount + leg.buyCommission,
    0
  );
  const totalBuyShares = legs.reduce((sum, leg) => sum + leg.buyShares, 0);
  const totalSellShares = legs.reduce((sum, leg) => sum + leg.sellShares, 0);
  const realizedGridProfit = legs.reduce((sum, leg) => sum + leg.gridNetProfit, 0);
  const basePositionShares = legs.reduce((sum, leg) => sum + leg.reservedShares, 0);
  const basePositionCost = legs.reduce((sum, leg) => sum + leg.reserveCost, 0);
  const basePositionMarketValue = basePositionShares * valuationPrice;
  const basePositionUnrealizedPnL = basePositionMarketValue - basePositionCost;
  const totalNetProfit = realizedGridProfit + basePositionUnrealizedPnL;
  const totalCommission = legs.reduce(
    (sum, leg) => sum + leg.buyCommission + leg.sellCommission,
    0
  );
  const totalSlippageCost = estimateSlippageCost(legs);
  const maxClusterCashDemand =
    aggregatedRows.length > 0
      ? Math.max(...aggregatedRows.map(row => row.totalBuyAmount))
      : 0;
  const costCoverageStepPct = calculateCostCoverageStepPct(
    params.basePrice,
    params.priceUnit,
    cost
  );

  return {
    totalBudget: params.totalBudget,
    amountPerGrid,
    totalBudgetRequired,
    budgetUsageRate:
      params.totalBudget > 0 ? totalBudgetRequired / params.totalBudget : 0,
    maxClusterCashDemand,
    totalBuyShares,
    totalSellShares,
    realizedGridProfit,
    realizedGridProfitRate:
      totalBudgetRequired > 0
        ? (realizedGridProfit / totalBudgetRequired) * 100
        : 0,
    basePositionShares,
    basePositionCost,
    basePositionMarketValue,
    basePositionUnrealizedPnL,
    totalNetProfit,
    totalNetProfitRate:
      totalBudgetRequired > 0
        ? (totalNetProfit / totalBudgetRequired) * 100
        : 0,
    totalCommission,
    totalSlippageCost,
    costCoverageStepPct,
  };
}

function estimateSlippageCost(legs: GridLeg[]): number {
  return legs.reduce((sum, leg) => {
    const buySlippage = (leg.buyExecutionPrice - leg.buyPrice) * leg.buyShares;
    const sellSlippage =
      (leg.sellPrice - leg.sellExecutionPrice) * leg.sellShares;
    return sum + buySlippage + sellSlippage;
  }, 0);
}
