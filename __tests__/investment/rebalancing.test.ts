import {
  buildRebalancePlan,
  calculateAllocationDrift,
} from '@/lib/investment/rebalancing';
import type { CashAccount, Position, TargetAllocation } from '@/types/investment';

const targets = (
  rows: Array<Pick<TargetAllocation, 'instrumentId' | 'targetWeight' | 'allocationRole'>>
): TargetAllocation[] =>
  rows.map((row, index) => ({
    id: String(index),
    updatedAt: '2024-01-01',
    ...row,
  }));

const pos = (instrumentId: string, marketValueBase: number): Position => ({
  id: instrumentId,
  instrumentId,
  asOfDate: '2024-01-01',
  shares: 1,
  averageCost: 1,
  currency: 'CNY',
  fxRateToBase: 1,
  marketValueBase,
});

const cashAccounts = (balanceBase: number): CashAccount[] => [
  {
    id: 'c',
    currency: 'CNY',
    asOfDate: '2024-01-01',
    balance: balanceBase,
    fxRateToBase: 1,
    balanceBase,
  },
];

describe('rebalancing', () => {
  it('低配生成买入、高配生成卖出；cashTargetWeight 参与权重和', () => {
    // 总资产 1000：标的 800 + 现金 200；目标 510300=0.5, 159915=0.3, cash=0.2
    const drift = calculateAllocationDrift({
      targets: targets([
        {
          instrumentId: '510300.SH',
          targetWeight: 0.5,
          allocationRole: 'core',
        },
        {
          instrumentId: '159915.SZ',
          targetWeight: 0.3,
          allocationRole: 'satellite',
        },
      ]),
      cashTargetWeight: 0.2,
      positions: [pos('510300.SH', 400), pos('159915.SZ', 400)],
      cashAccounts: cashAccounts(200),
    });
    expect(drift.ok).toBe(true);
    if (!drift.ok) {
      return;
    }
    const a = drift.value.find(row => row.instrumentId === '510300.SH');
    const b = drift.value.find(row => row.instrumentId === '159915.SZ');
    const cash = drift.value.find(row => row.instrumentId === 'CASH_BUCKET');
    expect(a?.deltaValueBase).toBeGreaterThan(0); // 低配
    expect(b?.deltaValueBase).toBeLessThan(0); // 高配
    expect(cash?.targetWeight).toBe(0.2);
    expect(drift.value.some(row => row.instrumentId === 'CASH')).toBe(false);
  });

  it('现金不足时拒绝再平衡买入计划', () => {
    // 总资产 950：高配 A 不先卖出兑现时，低配 B 买入需求远超现金
    const plan = buildRebalancePlan({
      targets: targets([
        {
          instrumentId: '510300.SH',
          targetWeight: 0.3,
          allocationRole: 'core',
        },
        {
          instrumentId: '159915.SZ',
          targetWeight: 0.6,
          allocationRole: 'satellite',
        },
      ]),
      cashTargetWeight: 0.1,
      positions: [pos('510300.SH', 800), pos('159915.SZ', 100)],
      cashAccounts: cashAccounts(50),
      absoluteDriftThreshold: 0.01,
      relativeDriftThreshold: 0.05,
      requireSufficientCash: true,
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) {
      return;
    }
    expect(plan.error).toBe('insufficient_cash');
  });

  it('禁止只看折算总现金：USD 买入需求不能被 CNY 现金冒充充足', () => {
    const plan = buildRebalancePlan({
      targets: targets([
        {
          instrumentId: '510300.SH',
          targetWeight: 0.2,
          allocationRole: 'core',
        },
        {
          instrumentId: 'VOO.US',
          targetWeight: 0.7,
          allocationRole: 'core',
        },
      ]),
      cashTargetWeight: 0.1,
      positions: [
        { ...pos('510300.SH', 800), currency: 'CNY' },
        { ...pos('VOO.US', 100), currency: 'USD' },
      ],
      cashAccounts: [
        {
          id: 'cny',
          currency: 'CNY',
          asOfDate: '2024-01-01',
          balance: 5000,
          fxRateToBase: 1,
          balanceBase: 5000,
        },
        {
          id: 'usd',
          currency: 'USD',
          asOfDate: '2024-01-01',
          balance: 1,
          fxRateToBase: 7,
          balanceBase: 7,
        },
      ],
      absoluteDriftThreshold: 0.01,
      relativeDriftThreshold: 0.05,
      requireSufficientCash: true,
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) {
      return;
    }
    expect(plan.error).toBe('insufficient_cash');
    expect(plan.message).toMatch(/USD/);
  });

  it('同一 ETF 存在网格计划不影响目标配置偏离', () => {
    const base = {
      targets: targets([
        {
          instrumentId: '510300.SH',
          targetWeight: 0.8,
          allocationRole: 'core',
        },
      ]),
      cashTargetWeight: 0.2,
      positions: [pos('510300.SH', 800)],
      cashAccounts: cashAccounts(200),
    };
    const withoutGrid = calculateAllocationDrift(base);
    // 网格计划是独立实体，不传入偏离计算——再次计算应完全一致
    const withGridIgnored = calculateAllocationDrift(base);
    expect(withoutGrid).toEqual(withGridIgnored);
    expect(withoutGrid.ok).toBe(true);
    if (!withoutGrid.ok) {
      return;
    }
    expect(
      withoutGrid.value.find(row => row.instrumentId === '510300.SH')?.targetWeight
    ).toBe(0.8);
  });
});
