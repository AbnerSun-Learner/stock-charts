import { aggregateGridLegs } from '@/lib/grid/aggregation';
import { generateLegsWithAmount } from '@/lib/grid/capital-allocation';
import { DEFAULT_GRID_PARAMS } from '@/types/grid';
import type { GridLeg, GridStrategyParamsV2 } from '@/types/grid-v2';

function buildLeg(id: string, buyPrice: number): GridLeg {
  return {
    id,
    gridType: 'small',
    gridLabel: '小网',
    indexInLayer: 0,
    buyPrice,
    buyExecutionPrice: buyPrice,
    sellPrice: buyPrice * 1.01,
    sellExecutionPrice: buyPrice * 1.01,
    effectiveStepRatio: 0.05,
    positionRatio: 1,
    amountWeight: 1,
    plannedBuyAmount: 1000,
    buyShares: 100,
    actualBuyAmount: buyPrice * 100,
    buyCommission: 0,
    sellShares: 100,
    reservedShares: 0,
    sellAmount: buyPrice * 100,
    sellCommission: 0,
    gridNetProfit: 0,
    reserveCost: 0,
    isBottomGrid: false,
  };
}

describe('aggregation', () => {
  it('应按小网半步长阈值聚合邻近价位', () => {
    const params = {
      ...DEFAULT_GRID_PARAMS,
      budgetMode: 'manual' as const,
      amountPerGrid: 10000,
    };
    const legs = generateLegsWithAmount(
      params,
      {
        dynamicGridEnabled: false,
        dynamicGridMode: 'stable',
      },
      10000
    );
    const rows = aggregateGridLegs(legs, params);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(legs.length);
  });

  it('tick 下限主导时应按当前 cluster anchor 重算阈值', () => {
    const params: GridStrategyParamsV2 = {
      ...DEFAULT_GRID_PARAMS,
      budgetMode: 'manual',
      smallGridStep: 1,
      priceUnit: 0.001,
      amountPerGrid: 10000,
    };
    const legs = [
      buildLeg('high', 1.0),
      buildLeg('mid', 0.15),
      buildLeg('near-mid', 0.1491),
    ];
    const rows = aggregateGridLegs(legs, params);

    expect(rows).toHaveLength(2);
    expect(rows[1].childLegIds).toEqual(['mid', 'near-mid']);
  });
});
