import type { GridParams, GridRow, GridType, StressTest } from '@/types/grid';

interface GridCalculationOptions {
  dynamicGridEnabled: boolean;
  dynamicGridMode: 'stable' | 'aggressive';
}

interface GridCalculationResult {
  gridData: GridRow[];
  stressTest: StressTest;
}

/**
 * 根据网格参数生成策略明细与压力测试结果。
 */
export function calculateGridStrategy(
  params: GridParams,
  options: GridCalculationOptions
): GridCalculationResult {
  const {
    minTradeUnit,
    basePrice,
    amountPerGrid,
    minPrice,
    smallGridStep,
    mediumGridStep,
    largeGridStep,
    amountMultiplier,
    profitReserveMultiplier,
  } = params;

  const { dynamicGridEnabled, dynamicGridMode } = options;

  const generateGridByType = (
    step: number,
    gridType: GridType,
    startPrice: number
  ): GridRow[] => {
    const grids: GridRow[] = [];
    let currentBuyPrice = startPrice;
    let previousBuyPrice = startPrice;
    let currentStep = step / 100;
    const scale = dynamicGridEnabled
      ? dynamicGridMode === 'stable'
        ? 0.3
        : 0.6
      : 0;
    const maxGrids = 10;

    const calculateBuyAmount = (positionRatio: number) =>
      amountPerGrid * (1 + amountMultiplier * (1 - positionRatio));

    const calculateSellShares = (buyShares: number, stepPercent: number) => {
      // 动态网格下步长会逐档放大，可能使留存比例超过 1，需钳制避免负卖出股数
      const targetSellShares =
        buyShares * Math.max(0, 1 - stepPercent * profitReserveMultiplier);
      return Math.floor(targetSellShares / minTradeUnit) * minTradeUnit;
    };

    for (let i = 0; i < maxGrids; i++) {
      let buyPrice: number;
      if (i === 0) {
        buyPrice = startPrice;
      } else {
        buyPrice = parseFloat(
          (currentBuyPrice * (1 - currentStep)).toFixed(3)
        );
      }

      if (buyPrice <= minPrice) break;

      const position = parseFloat((buyPrice / basePrice).toFixed(2));
      const buyAmount = calculateBuyAmount(position);
      const buyShares =
        Math.floor(buyAmount / buyPrice / minTradeUnit) * minTradeUnit;
      const actualBuyAmount = buyShares * buyPrice;

      // 单格金额不足一手时跳过该档位，避免产生 0 股无效行污染下游图表与汇总
      if (buyShares <= 0) {
        previousBuyPrice = buyPrice;
        currentBuyPrice = buyPrice;
        if (i >= 1 && dynamicGridEnabled) {
          currentStep = currentStep * (1 + scale);
        }
        continue;
      }

      const sellPrice =
        i === 0
          ? parseFloat((startPrice * (1 + currentStep)).toFixed(3))
          : previousBuyPrice;

      const slippage = params.priceUnit * 5;
      const buyTriggerPrice = parseFloat((buyPrice + slippage).toFixed(3));
      const sellTriggerPrice = parseFloat((sellPrice - slippage).toFixed(3));

      const sellShares = calculateSellShares(buyShares, currentStep);
      const sellAmount = sellShares * sellPrice;

      const priceDropRate =
        i === 0
          ? 0
          : parseFloat(
              (
                ((buyPrice - previousBuyPrice) / previousBuyPrice) *
                100
              ).toFixed(2)
            );

      let dropFromBase = 0;
      if (i === 0 && (gridType === '中网' || gridType === '大网')) {
        dropFromBase = parseFloat(
          (((basePrice - buyPrice) / basePrice) * 100).toFixed(2)
        );
      }

      grids.push({
        position,
        buyTriggerPrice,
        buyPrice,
        buyAmount: Math.round(actualBuyAmount),
        buyShares,
        sellTriggerPrice,
        sellPrice,
        sellShares,
        sellAmount: Math.round(sellAmount),
        priceDropRate: dropFromBase > 0 ? dropFromBase : priceDropRate,
        gridType,
      });

      previousBuyPrice = buyPrice;
      currentBuyPrice = buyPrice;

      if (i >= 1 && dynamicGridEnabled) {
        currentStep = currentStep * (1 + scale);
      } else if (!dynamicGridEnabled) {
        currentStep = step / 100;
      }
    }

    return grids;
  };

  const smallGrids = generateGridByType(smallGridStep, '小网', basePrice);
  const mediumStartPrice = basePrice * (1 - mediumGridStep / 100);
  const mediumGrids = generateGridByType(
    mediumGridStep,
    '中网',
    mediumStartPrice
  );
  const largeStartPrice = basePrice * (1 - largeGridStep / 100);
  const largeGrids = generateGridByType(
    largeGridStep,
    '大网',
    largeStartPrice
  );

  const allGrids = [...smallGrids, ...mediumGrids, ...largeGrids].sort(
    (a, b) => b.buyPrice - a.buyPrice
  );

  const totalBuyAmount = allGrids.reduce((sum, row) => sum + row.buyAmount, 0);
  const totalBuyShares = allGrids.reduce((sum, row) => sum + row.buyShares, 0);
  const totalSellAmount = allGrids.reduce(
    (sum, row) => sum + row.sellAmount,
    0
  );
  const totalSellShares = allGrids.reduce(
    (sum, row) => sum + row.sellShares,
    0
  );
  const remainingShares = totalBuyShares - totalSellShares;
  const profit =
    totalSellAmount - totalBuyAmount + remainingShares * basePrice;
  const profitRate =
    totalBuyAmount > 0 ? (profit / totalBuyAmount) * 100 : 0;

  const stressTest: StressTest = {
    totalBuyAmount: Math.round(totalBuyAmount),
    totalBuyShares,
    totalSellAmount: Math.round(totalSellAmount),
    totalSellShares,
    remainingShares,
    profit: Math.round(profit),
    profitRate: parseFloat(profitRate.toFixed(2)),
  };

  return { gridData: allGrids, stressTest };
}
