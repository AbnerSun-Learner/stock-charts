import { calculateGridStrategy } from '@/lib/grid-calculator';
import type { GridParams } from '@/types/grid';

const DEFAULT_PARAMS: GridParams = {
  minTradeUnit: 100,
  priceUnit: 0.001,
  basePrice: 1.0,
  amountPerGrid: 10000,
  minPrice: 0.5,
  smallGridStep: 5.0,
  mediumGridStep: 15.0,
  largeGridStep: 30.0,
  amountMultiplier: 1.0,
  profitReserveMultiplier: 1.0,
};

describe('calculateGridStrategy', () => {
  it('应生成小/中/大网网格并按买入价降序排列', () => {
    const { gridData, stressTest } = calculateGridStrategy(DEFAULT_PARAMS, {
      dynamicGridEnabled: false,
      dynamicGridMode: 'stable',
    });

    expect(gridData.length).toBeGreaterThan(0);
    expect(stressTest).not.toBeNull();

    const types = new Set(gridData.map(row => row.gridType));
    expect(types.has('小网')).toBe(true);
    expect(types.has('中网')).toBe(true);
    expect(types.has('大网')).toBe(true);

    for (let i = 1; i < gridData.length; i++) {
      expect(gridData[i - 1].buyPrice).toBeGreaterThanOrEqual(
        gridData[i].buyPrice
      );
    }
  });

  it('压力测试应满足利润公式', () => {
    const { gridData, stressTest } = calculateGridStrategy(DEFAULT_PARAMS, {
      dynamicGridEnabled: false,
      dynamicGridMode: 'stable',
    });

    expect(stressTest).not.toBeNull();
    if (!stressTest) return;

    const totalBuyAmount = gridData.reduce((sum, row) => sum + row.buyAmount, 0);
    const totalBuyShares = gridData.reduce((sum, row) => sum + row.buyShares, 0);
    const totalSellAmount = gridData.reduce(
      (sum, row) => sum + row.sellAmount,
      0
    );
    const totalSellShares = gridData.reduce(
      (sum, row) => sum + row.sellShares,
      0
    );
    const remainingShares = totalBuyShares - totalSellShares;
    const profit =
      totalSellAmount -
      totalBuyAmount +
      remainingShares * DEFAULT_PARAMS.basePrice;

    expect(stressTest.totalBuyAmount).toBe(Math.round(totalBuyAmount));
    expect(stressTest.remainingShares).toBe(remainingShares);
    expect(stressTest.profit).toBe(Math.round(profit));
  });

  it('动态网格模式应产生与静态模式不同的结果', () => {
    const staticResult = calculateGridStrategy(DEFAULT_PARAMS, {
      dynamicGridEnabled: false,
      dynamicGridMode: 'stable',
    });
    const dynamicResult = calculateGridStrategy(DEFAULT_PARAMS, {
      dynamicGridEnabled: true,
      dynamicGridMode: 'aggressive',
    });

    expect(dynamicResult.gridData.length).toBeGreaterThan(0);
    expect(dynamicResult.stressTest).not.toBeNull();
    expect(dynamicResult.gridData).not.toEqual(staticResult.gridData);
  });
});
