import type { TradeCostParams } from '@/types/grid-v2';

export type TickRoundMode = 'nearest' | 'down' | 'up';

/**
 * 将价格取整到 tick 精度。
 */
export function roundToTick(
  price: number,
  tickSize: number,
  mode: TickRoundMode
): number {
  if (tickSize <= 0) return price;
  const factor = 1 / tickSize;
  const scaled = price * factor;
  let rounded: number;
  switch (mode) {
    case 'down':
      rounded = Math.floor(scaled);
      break;
    case 'up':
      rounded = Math.ceil(scaled);
      break;
    default:
      rounded = Math.round(scaled);
      break;
  }
  return rounded / factor;
}

/**
 * 计算买入执行价（含滑点，保守向上取整）。
 */
export function getBuyExecutionPrice(
  buyPrice: number,
  priceUnit: number,
  slippageTicks: number
): number {
  return roundToTick(buyPrice + slippageTicks * priceUnit, priceUnit, 'up');
}

/**
 * 计算卖出执行价（含滑点，保守向下取整）。
 */
export function getSellExecutionPrice(
  sellPrice: number,
  priceUnit: number,
  slippageTicks: number
): number {
  return roundToTick(
    Math.max(0, sellPrice - slippageTicks * priceUnit),
    priceUnit,
    'down'
  );
}

/**
 * 计算单边佣金。
 */
export function calculateCommission(
  executionPrice: number,
  shares: number,
  rate: number,
  minCommission: number
): number {
  if (shares <= 0) return 0;
  return Math.max(minCommission, executionPrice * shares * rate);
}

/**
 * 计算往返成本覆盖步长（百分比）。
 */
export function calculateCostCoverageStepPct(
  basePrice: number,
  priceUnit: number,
  cost: TradeCostParams
): number {
  if (basePrice <= 0) return 0;
  const roundTripCostRate =
    cost.buyCommissionRate +
    cost.sellCommissionRate +
    cost.stampDutyRate +
    cost.transferFeeRate +
    (2 * cost.slippageTicks * priceUnit) / basePrice;
  return roundTripCostRate * 100;
}

/**
 * 从参数对象提取交易成本配置。
 */
export function extractTradeCost(params: {
  buyCommissionRate: number;
  sellCommissionRate: number;
  minCommission: number;
  stampDutyRate: number;
  transferFeeRate: number;
  slippageTicks: number;
}): TradeCostParams {
  return {
    buyCommissionRate: params.buyCommissionRate,
    sellCommissionRate: params.sellCommissionRate,
    minCommission: params.minCommission,
    stampDutyRate: params.stampDutyRate,
    transferFeeRate: params.transferFeeRate,
    slippageTicks: params.slippageTicks,
  };
}
