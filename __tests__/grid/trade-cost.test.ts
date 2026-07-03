import {
  calculateCommission,
  calculateCostCoverageStepPct,
  getBuyExecutionPrice,
  getSellExecutionPrice,
  roundToTick,
} from '@/lib/grid/trade-cost';
import { DEFAULT_TRADE_COST } from '@/types/grid-v2';

describe('trade-cost', () => {
  it('roundToTick 应按模式取整', () => {
    expect(roundToTick(1.2346, 0.001, 'down')).toBe(1.234);
    expect(roundToTick(1.2341, 0.001, 'up')).toBe(1.235);
    expect(roundToTick(1.2345, 0.001, 'nearest')).toBe(1.235);
  });

  it('执行价应包含滑点', () => {
    expect(getBuyExecutionPrice(1.0, 0.001, 5)).toBe(1.005);
    expect(getSellExecutionPrice(1.05, 0.001, 5)).toBe(1.045);
  });

  it('佣金应 respect minCommission', () => {
    expect(calculateCommission(1, 100, 0.0001, 0)).toBeCloseTo(0.01, 4);
    expect(calculateCommission(1, 100, 0.0001, 5)).toBe(5);
  });

  it('0 股时不应收最低佣金', () => {
    expect(calculateCommission(1.05, 0, 0.0001, 5)).toBe(0);
  });

  it('成本覆盖步长应可计算', () => {
    const pct = calculateCostCoverageStepPct(1.0, 0.001, DEFAULT_TRADE_COST);
    expect(pct).toBeGreaterThan(0);
  });
});
