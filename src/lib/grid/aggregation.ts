import type {
  AggregatedGridRow,
  AggregatedSellPlan,
  GridLeg,
  GridStrategyParamsV2,
} from '@/types/grid-v2';
import { clusterByBuyPrice } from '@/lib/grid/aggregation-threshold';
import { roundToTick } from '@/lib/grid/trade-cost';

/**
 * 跨层价位聚合，不改变内部 GridLeg 语义。
 */
export function aggregateGridLegs(
  legs: GridLeg[],
  params: GridStrategyParamsV2
): AggregatedGridRow[] {
  return clusterByBuyPrice(
    legs,
    params.smallGridStep,
    params.priceUnit
  ).map((cluster, clusterIndex) =>
    buildAggregatedRow(cluster, clusterIndex, params)
  );
}

function buildAggregatedRow(
  cluster: GridLeg[],
  clusterIndex: number,
  params: GridStrategyParamsV2
): AggregatedGridRow {
  const gridTypes = Array.from(new Set(cluster.map(leg => leg.gridLabel)));
  const buyPrices = cluster.map(leg => leg.buyPrice);
  const buyPriceHigh = Math.max(...buyPrices);
  const buyPriceLow = Math.min(...buyPrices);
  const totalBuyShares = cluster.reduce((sum, leg) => sum + leg.buyShares, 0);
  const totalBuyAmount = cluster.reduce(
    (sum, leg) => sum + leg.actualBuyAmount + leg.buyCommission,
    0
  );
  const weightedBuySum = cluster.reduce(
    (sum, leg) => sum + leg.buyPrice * leg.buyShares,
    0
  );
  const displayBuyPrice =
    totalBuyShares > 0
      ? roundToTick(weightedBuySum / totalBuyShares, params.priceUnit, 'nearest')
      : buyPriceHigh;

  const sellPlans: AggregatedSellPlan[] = cluster.map(leg => ({
    legId: leg.id,
    gridLabel: leg.gridLabel,
    sellPrice: leg.sellPrice,
    sellShares: leg.sellShares,
  }));

  return {
    clusterId: `cluster-${clusterIndex}`,
    gridTypes,
    displayType: formatDisplayType(gridTypes),
    buyPriceHigh,
    buyPriceLow,
    displayBuyPrice,
    triggerBuyPrice: buyPriceHigh,
    totalBuyAmount,
    totalBuyShares,
    childLegIds: cluster.map(leg => leg.id),
    sellPlans,
  };
}

function formatDisplayType(gridTypes: string[]): string {
  if (gridTypes.length === 1) return gridTypes[0];
  return `组合：${gridTypes.join('+')}`;
}
