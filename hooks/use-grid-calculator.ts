import { useCallback } from "react";
import type { GridParams, GridRow, GridType, StressTest } from "@/types/grid";

interface UseGridCalculatorProps {
  params: GridParams;
  validateParams: () => { isValid: boolean; errors: string[] };
  dynamicGridEnabled: boolean;
  dynamicGridMode: "stable" | "aggressive";
}

export function useGridCalculator({
  params,
  validateParams,
  dynamicGridEnabled,
  dynamicGridMode,
}: UseGridCalculatorProps) {
  const calculateGrid = useCallback(() => {
    const validation = validateParams();
    if (!validation.isValid) {
      return { gridData: [], stressTest: null };
    }

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

    // 生成单个类型的网格
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
        ? dynamicGridMode === "stable"
          ? 0.3
          : 0.6
        : 0;
      const maxGrids = 10;

      // 辅助函数：根据档位计算金额加码
      const calculateBuyAmount = (档位: number) => {
        return amountPerGrid * (1 + amountMultiplier * (1 - 档位));
      };

      // 辅助函数：计算卖出股数（保留利润逻辑）
      const calculateSellShares = (buyShares: number, stepPercent: number) => {
        const targetSellShares =
          buyShares * (1 - stepPercent * profitReserveMultiplier);
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

        const sellPrice =
          i === 0
            ? parseFloat((startPrice * (1 + currentStep)).toFixed(3))
            : previousBuyPrice;

        const slippage = params.priceUnit * 5;
        const buyTriggerPrice = parseFloat((buyPrice + slippage).toFixed(3));
        const sellTriggerPrice = parseFloat((sellPrice - slippage).toFixed(3));

        const sellShares = calculateSellShares(buyShares, currentStep);
        const sellAmount = sellShares * sellPrice;

        // 计算跌幅：相对于上一档位的跌幅
        const priceDropRate =
          i === 0
            ? 0
            : parseFloat(
                (
                  ((buyPrice - previousBuyPrice) / previousBuyPrice) *
                  100
                ).toFixed(2)
              );

        // 对于中网和大网的第一个档位，计算相对于基准价的跌幅
        let dropFromBase = 0;
        if (i === 0 && (gridType === "中网" || gridType === "大网")) {
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

    // 生成小网（基础步长）
    const smallGrids = generateGridByType(smallGridStep, "小网", basePrice);

    // 生成中网（中网步长，从基准价下跌中网步长%开始）
    const mediumStartPrice = basePrice * (1 - mediumGridStep / 100);
    const mediumGrids = generateGridByType(
      mediumGridStep,
      "中网",
      mediumStartPrice
    );

    // 生成大网（大网步长，从基准价下跌大网步长%开始）
    const largeStartPrice = basePrice * (1 - largeGridStep / 100);
    const largeGrids = generateGridByType(
      largeGridStep,
      "大网",
      largeStartPrice
    );

    // 合并所有网格并按买入价降序排序
    const allGrids = [...smallGrids, ...mediumGrids, ...largeGrids].sort(
      (a, b) => b.buyPrice - a.buyPrice
    );

    // 计算压力测试
    const totalBuyAmount = allGrids.reduce(
      (sum, row) => sum + row.buyAmount,
      0
    );
    const totalBuyShares = allGrids.reduce(
      (sum, row) => sum + row.buyShares,
      0
    );
    const totalSellAmount = allGrids.reduce(
      (sum, row) => sum + row.sellAmount,
      0
    );
    const totalSellShares = allGrids.reduce(
      (sum, row) => sum + row.sellShares,
      0
    );
    const remainingShares = totalBuyShares - totalSellShares;

    // 预期利润 = 卖出金额 - 买入金额 + 剩余股数 * 基准价
    const profit =
      totalSellAmount - totalBuyAmount + remainingShares * basePrice;

    // 收益率 = 利润 / 买入金额 * 100
    const profitRate = totalBuyAmount > 0 ? (profit / totalBuyAmount) * 100 : 0;

    const stressTestResult: StressTest = {
      totalBuyAmount: Math.round(totalBuyAmount),
      totalBuyShares,
      totalSellAmount: Math.round(totalSellAmount),
      totalSellShares,
      remainingShares,
      profit: Math.round(profit),
      profitRate: parseFloat(profitRate.toFixed(2)),
    };

    return { gridData: allGrids, stressTest: stressTestResult };
  }, [
    params,
    validateParams,
    dynamicGridEnabled,
    dynamicGridMode,
  ]);

  return { calculateGrid };
}
