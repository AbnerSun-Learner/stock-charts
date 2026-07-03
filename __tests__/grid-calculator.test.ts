import { calculateGridStrategy } from '@/lib/grid-calculator';
import { DEFAULT_GRID_PARAMS } from '@/types/grid';

describe('calculateGridStrategy', () => {
  it('应生成小/中/大网网格并按买入价降序排列', () => {
    const manualParams = {
      ...DEFAULT_GRID_PARAMS,
      budgetMode: 'manual' as const,
      amountPerGrid: 10000,
    };
    const { gridData, stressTest } = calculateGridStrategy(manualParams, {
      dynamicGridEnabled: false,
      dynamicGridMode: 'stable',
    });

    expect(gridData.length).toBeGreaterThan(0);
    expect(stressTest).not.toBeNull();
    expect(stressTest.v2).toBeDefined();

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

  it('压力测试应满足 V2 净利润公式', () => {
    const manualParams = {
      ...DEFAULT_GRID_PARAMS,
      budgetMode: 'manual' as const,
      amountPerGrid: 10000,
    };
    const { stressTest } = calculateGridStrategy(manualParams, {
      dynamicGridEnabled: false,
      dynamicGridMode: 'stable',
    });

    expect(stressTest.v2).toBeDefined();
    if (!stressTest.v2) return;

    expect(stressTest.v2.totalNetProfit).toBeCloseTo(
      stressTest.v2.realizedGridProfit +
        stressTest.v2.basePositionUnrealizedPnL,
      4
    );
  });

  it('动态网格模式应产生与静态模式不同的结果', () => {
    const manualParams = {
      ...DEFAULT_GRID_PARAMS,
      budgetMode: 'manual' as const,
      amountPerGrid: 10000,
    };
    const staticResult = calculateGridStrategy(manualParams, {
      dynamicGridEnabled: false,
      dynamicGridMode: 'stable',
    });
    const dynamicResult = calculateGridStrategy(manualParams, {
      dynamicGridEnabled: true,
      dynamicGridMode: 'aggressive',
    });

    expect(dynamicResult.gridData.length).toBeGreaterThan(0);
    expect(dynamicResult.gridData).not.toEqual(staticResult.gridData);
  });

  it('单格金额不足一手时不应产生 0 股档位', () => {
    const manualParams = {
      ...DEFAULT_GRID_PARAMS,
      budgetMode: 'manual' as const,
      amountPerGrid: 50,
    };
    const { gridData } = calculateGridStrategy(manualParams, {
      dynamicGridEnabled: false,
      dynamicGridMode: 'stable',
    });
    for (const row of gridData) {
      expect(row.buyShares).toBeGreaterThan(0);
    }
  });
});
