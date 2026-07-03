import {
  buildStrategyComparisonData,
  computeBreakEvenRise,
  computeTooltipMetrics,
} from '@/lib/strategy-comparison';
import type { GridRow } from '@/types/grid';

/** 构造测试用网格行，未关注字段填充默认值 */
function makeRow(partial: Partial<GridRow>): GridRow {
  return {
    position: 1,
    buyTriggerPrice: 0,
    buyPrice: 100,
    buyAmount: 10000,
    buyShares: 100,
    sellTriggerPrice: 0,
    sellPrice: 0,
    sellShares: 0,
    sellAmount: 0,
    priceDropRate: 0,
    gridType: '小网',
    ...partial,
  };
}

describe('computeBreakEvenRise', () => {
  it('跌幅 0% 时回本需涨 0%', () => {
    expect(computeBreakEvenRise(0)).toBe(0);
  });

  it('跌幅 50% 时回本需涨 100%', () => {
    expect(computeBreakEvenRise(50)).toBeCloseTo(100);
  });

  it('跌幅 >= 100% 时无法回本，返回 Infinity', () => {
    expect(computeBreakEvenRise(100)).toBe(Number.POSITIVE_INFINITY);
    expect(computeBreakEvenRise(120)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('buildStrategyComparisonData', () => {
  const basePrice = 100;
  const rows: GridRow[] = [
    makeRow({ buyPrice: 100, buyAmount: 10000, buyShares: 100, position: 1 }),
    makeRow({ buyPrice: 80, buyAmount: 8000, buyShares: 100, position: 0.8 }),
  ];

  it('空数据或非法基准价返回空数组', () => {
    expect(buildStrategyComparisonData([], basePrice, 2)).toEqual([]);
    expect(buildStrategyComparisonData(rows, 0, 2)).toEqual([]);
  });

  it('首个档位（基准价买入）浮亏为 0', () => {
    const points = buildStrategyComparisonData(rows, basePrice, 2);
    expect(points[0].lumpSumFloatingLoss).toBeCloseTo(0);
    expect(points[0].gridFloatingLoss).toBeCloseTo(0);
    expect(points[0].gridAverageCost).toBeCloseTo(100);
  });

  it('低价档位应正确累计平均成本与浮亏', () => {
    const points = buildStrategyComparisonData(rows, basePrice, 2);
    const p = points[1];

    // 一次全仓：总额 18000，跌幅 20%，浮亏 3600
    expect(p.lumpSumFloatingLoss).toBeCloseTo(3600);
    expect(p.lumpSumFloatingLossRate).toBeCloseTo(-20);

    // 本策略：累计买入 18000 元 / 200 股，平均成本 90，跌幅 10%，浮亏 1800
    expect(p.gridAverageCost).toBeCloseTo(90);
    expect(p.gridFloatingLossRate).toBeCloseTo(-10);
    expect(p.gridFloatingLoss).toBeCloseTo(1800);

    // 优势 = 少亏 1800
    expect(p.advantage).toBeCloseTo(1800);
  });

  it('应跳过 0 股档位，避免除零', () => {
    const withZero = [
      rows[0],
      makeRow({ buyPrice: 90, buyAmount: 0, buyShares: 0 }),
      rows[1],
    ];
    const points = buildStrategyComparisonData(withZero, basePrice, 2);
    expect(points).toHaveLength(2);
    expect(points.every(p => Number.isFinite(p.gridAverageCost))).toBe(true);
  });

  it('价格标签应遵循小数位参数', () => {
    const points = buildStrategyComparisonData(rows, basePrice, 3);
    expect(points[0].priceLabel).toBe('¥100.000');
  });
});

describe('computeTooltipMetrics', () => {
  it('派生指标应满足少亏与回本门槛公式', () => {
    const points = buildStrategyComparisonData(
      [
        makeRow({ buyPrice: 100, buyAmount: 10000, buyShares: 100 }),
        makeRow({ buyPrice: 50, buyAmount: 10000, buyShares: 200 }),
      ],
      100,
      2
    );
    const metrics = computeTooltipMetrics(points[1]);

    expect(metrics.lumpSumDropRate).toBeCloseTo(50);
    expect(metrics.lumpSumBreakEvenRise).toBeCloseTo(100);
    expect(metrics.lessLoss).toBeCloseTo(
      points[1].lumpSumFloatingLoss - points[1].gridFloatingLoss
    );
    expect(metrics.breakEvenThreshold).toBeCloseTo(
      metrics.lumpSumDropRate - metrics.gridDropRate
    );
  });
});
