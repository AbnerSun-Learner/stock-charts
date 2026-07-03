import type {
  GridLeg,
  GridStrategyOptionsV2,
  GridStrategyParamsV2,
  PriceLadderEntry,
} from '@/types/grid-v2';
import {
  calculateCommission,
  extractTradeCost,
  getBuyExecutionPrice,
  getSellExecutionPrice,
} from '@/lib/grid/trade-cost';
import { generateAllPriceLadders } from '@/lib/grid/price-ladder';

/**
 * 为价格线分配资金并生成 GridLeg。
 */
export function allocateLegsFromLadder(
  params: GridStrategyParamsV2,
  options: GridStrategyOptionsV2,
  amountPerGrid: number,
  ladder: PriceLadderEntry[]
): GridLeg[] {
  const cost = extractTradeCost(params);
  const legs: GridLeg[] = [];

  ladder.forEach((entry, index) => {
    const leg = buildLegFromEntry(params, amountPerGrid, entry, index, cost);
    if (leg.buyShares > 0) {
      legs.push(leg);
    }
  });

  return legs;
}

/**
 * 生成完整 legs（含价格线与资金分配）。
 */
export function generateLegsWithAmount(
  params: GridStrategyParamsV2,
  options: GridStrategyOptionsV2,
  amountPerGrid: number
): GridLeg[] {
  const ladder = generateAllPriceLadders(params, options);
  return allocateLegsFromLadder(params, options, amountPerGrid, ladder);
}

/**
 * 二分搜索反推最大可负担单格金额。
 */
export function resolveAmountPerGrid(
  params: GridStrategyParamsV2,
  options: GridStrategyOptionsV2
): number {
  if (params.budgetMode === 'manual') {
    return params.amountPerGrid;
  }

  let low = 0;
  let high = params.totalBudget;
  const precision = Math.max(1, params.priceUnit * params.minTradeUnit);

  while (high - low > precision) {
    const mid = (low + high) / 2;
    if (canAffordAmountPerGrid(params, options, mid)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.floor(low);
}

/**
 * 判断给定单格金额是否在总弹药预算内。
 */
export function canAffordAmountPerGrid(
  params: GridStrategyParamsV2,
  options: GridStrategyOptionsV2,
  amountPerGrid: number
): boolean {
  const legs = generateLegsWithAmount(params, options, amountPerGrid);
  const totalCost = legs.reduce(
    (sum, leg) => sum + leg.actualBuyAmount + leg.buyCommission,
    0
  );
  return totalCost <= params.totalBudget;
}

/**
 * 计算所有有效腿的预计总投入。
 */
export function calculateTotalBudgetRequired(legs: GridLeg[]): number {
  return legs.reduce(
    (sum, leg) => sum + leg.actualBuyAmount + leg.buyCommission,
    0
  );
}

function buildLegFromEntry(
  params: GridStrategyParamsV2,
  amountPerGrid: number,
  entry: PriceLadderEntry,
  index: number,
  cost: ReturnType<typeof extractTradeCost>
): GridLeg {
  const positionRatio = entry.buyPrice / params.basePrice;
  const amountWeight = 1 + params.amountMultiplier * (1 - positionRatio);
  const plannedBuyAmount = amountPerGrid * amountWeight;
  const buyExecutionPrice = getBuyExecutionPrice(
    entry.buyPrice,
    params.priceUnit,
    cost.slippageTicks
  );
  const buyShares =
    Math.floor(plannedBuyAmount / buyExecutionPrice / params.minTradeUnit) *
    params.minTradeUnit;
  const actualBuyAmount = buyShares * buyExecutionPrice;
  const buyCommission = calculateCommission(
    buyExecutionPrice,
    buyShares,
    cost.buyCommissionRate,
    cost.minCommission
  );

  const rawSellShares =
    buyShares *
    Math.max(0, 1 - entry.effectiveStepRatio * params.profitReserveMultiplier);
  const sellShares =
    Math.floor(rawSellShares / params.minTradeUnit) * params.minTradeUnit;
  const reservedShares = buyShares - sellShares;
  const sellExecutionPrice = getSellExecutionPrice(
    entry.sellPrice,
    params.priceUnit,
    cost.slippageTicks
  );
  const sellAmount = sellExecutionPrice * sellShares;
  const sellCommission =
    calculateCommission(
      sellExecutionPrice,
      sellShares,
      cost.sellCommissionRate,
      cost.minCommission
    ) +
    sellExecutionPrice *
      sellShares *
      (cost.stampDutyRate + cost.transferFeeRate);

  const allocatedBuyCommissionForSold =
    buyShares > 0 ? (buyCommission * sellShares) / buyShares : 0;
  const allocatedBuyCommissionForReserved =
    buyShares > 0 ? (buyCommission * reservedShares) / buyShares : 0;

  const gridNetProfit =
    sellExecutionPrice * sellShares -
    sellCommission -
    buyExecutionPrice * sellShares -
    allocatedBuyCommissionForSold;
  const reserveCost =
    buyExecutionPrice * reservedShares + allocatedBuyCommissionForReserved;

  return {
    id: `${entry.gridType}-${entry.indexInLayer}-${index}`,
    gridType: entry.gridType,
    gridLabel: entry.gridLabel,
    indexInLayer: entry.indexInLayer,
    buyPrice: entry.buyPrice,
    buyExecutionPrice,
    sellPrice: entry.sellPrice,
    sellExecutionPrice,
    effectiveStepRatio: entry.effectiveStepRatio,
    positionRatio,
    amountWeight,
    plannedBuyAmount,
    buyShares,
    actualBuyAmount,
    buyCommission,
    sellShares,
    reservedShares,
    sellAmount,
    sellCommission,
    gridNetProfit,
    reserveCost,
    isBottomGrid: entry.isBottomGrid,
  };
}
