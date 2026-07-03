import type {
  AggregatedGridRow,
  AggregatedSellPlan,
  GridLeg,
  GridStrategyParamsV2,
} from '@/types/grid-v2';
import { roundToTick } from '@/lib/grid/trade-cost';

/**
 * 跨层价位聚合，不改变内部 GridLeg 语义。
 */
export function aggregateGridLegs(
  legs: GridLeg[],
  params: GridStrategyParamsV2
): AggregatedGridRow[] {
  if (legs.length === 0) return [];

  const sorted = [...legs].sort((a, b) => b.buyPrice - a.buyPrice);

  const rows: AggregatedGridRow[] = [];
  let clusterIndex = 0;
  let currentCluster: GridLeg[] = [sorted[0]];
  let anchorPrice = sorted[0].buyPrice;

  for (let i = 1; i < sorted.length; i += 1) {
    const leg = sorted[i];
    const thresholdPct = getAggregationThresholdPct(
      params.smallGridStep,
      params.priceUnit,
      anchorPrice
    );
    const diffPct =
      (Math.abs(leg.buyPrice - anchorPrice) / anchorPrice) * 100;

    if (diffPct <= thresholdPct) {
      currentCluster.push(leg);
    } else {
      rows.push(buildAggregatedRow(currentCluster, clusterIndex, params));
      clusterIndex += 1;
      currentCluster = [leg];
      anchorPrice = leg.buyPrice;
    }
  }

  rows.push(buildAggregatedRow(currentCluster, clusterIndex, params));
  return rows;
}

function getAggregationThresholdPct(
  smallGridStep: number,
  priceUnit: number,
  anchorPrice: number
): number {
  const tickThresholdPct =
    anchorPrice > 0 ? (priceUnit / anchorPrice) * 100 : 0;
  return Math.max(smallGridStep / 2, tickThresholdPct);
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
