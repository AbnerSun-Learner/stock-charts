/**
 * 判断候选价位是否会与锚点价位进入同一聚合组。
 */
export function isWithinAggregationThreshold(
  anchorPrice: number,
  candidatePrice: number,
  smallGridStep: number,
  priceUnit: number
): boolean {
  if (anchorPrice <= 0) return false;

  const tickThresholdPct = (priceUnit / anchorPrice) * 100;
  const thresholdPct = Math.max(smallGridStep / 2, tickThresholdPct);
  const diffPct =
    (Math.abs(candidatePrice - anchorPrice) / anchorPrice) * 100;

  return diffPct <= thresholdPct;
}

/**
 * 按最终展示口径对买入价分组，组内始终使用第一条记录的价格作为锚点。
 */
export function clusterByBuyPrice<T extends { buyPrice: number }>(
  items: T[],
  smallGridStep: number,
  priceUnit: number
): T[][] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.buyPrice - a.buyPrice);
  const clusters: T[][] = [];
  let currentCluster: T[] = [sorted[0]];
  let anchorPrice = sorted[0].buyPrice;

  for (let i = 1; i < sorted.length; i += 1) {
    const item = sorted[i];
    if (
      isWithinAggregationThreshold(
        anchorPrice,
        item.buyPrice,
        smallGridStep,
        priceUnit
      )
    ) {
      currentCluster.push(item);
      continue;
    }

    clusters.push(currentCluster);
    currentCluster = [item];
    anchorPrice = item.buyPrice;
  }

  clusters.push(currentCluster);
  return clusters;
}
