import { computeDashboardMetrics } from '@/lib/investment/dashboard-metrics';
import {
  filterLedgerAsOfDate,
  resolveLatestValuationDate,
} from '@/lib/investment/valuation-date';
import type {
  CashAccount,
  CashFlow,
  Position,
  TargetAllocation,
} from '@/types/investment';

const pos = (
  instrumentId: string,
  marketValueBase: number,
  asOfDate = '2024-06-01'
): Position => ({
  id: `${instrumentId}-${asOfDate}`,
  instrumentId,
  asOfDate,
  shares: 1,
  averageCost: 1,
  currency: 'CNY',
  fxRateToBase: 1,
  marketValueBase,
  currentPrice: 1,
  marketValue: marketValueBase,
});

const cash = (balanceBase: number, asOfDate = '2024-06-01'): CashAccount[] => [
  {
    id: `c-${asOfDate}`,
    currency: 'CNY',
    asOfDate,
    balance: balanceBase,
    fxRateToBase: 1,
    balanceBase,
  },
];

describe('computeDashboardMetrics', () => {
  it('空账本给出 empty_ledger 警告', () => {
    const metrics = computeDashboardMetrics({
      settings: null,
      targets: [],
      positions: [],
      cashAccounts: [],
      cashFlows: [],
      snapshots: [],
      valuationDate: '2024-06-01',
    });
    expect(metrics.warnings.some(item => item.code === 'empty_ledger')).toBe(
      true
    );
    expect(metrics.totals?.totalAssetsBase ?? 0).toBe(0);
  });

  it('缺目标配置时警告', () => {
    const metrics = computeDashboardMetrics({
      settings: null,
      targets: [],
      positions: [pos('510300.SH', 100)],
      cashAccounts: cash(0),
      cashFlows: [],
      snapshots: [],
      valuationDate: '2024-06-01',
    });
    expect(metrics.warnings.some(item => item.code === 'missing_targets')).toBe(
      true
    );
  });

  it('缺估值字段时警告', () => {
    const bare: Position = {
      id: '1',
      instrumentId: '510300.SH',
      asOfDate: '2024-06-01',
      shares: 1,
      averageCost: 1,
      currency: 'CNY',
    };
    const metrics = computeDashboardMetrics({
      settings: null,
      targets: [
        {
          id: 't',
          instrumentId: '510300.SH',
          targetWeight: 1,
          allocationRole: 'core',
          updatedAt: '2024-01-01',
        },
      ],
      positions: [bare],
      cashAccounts: [],
      cashFlows: [],
      snapshots: [],
      valuationDate: '2024-06-01',
    });
    expect(
      metrics.warnings.some(item => item.code === 'missing_valuation')
    ).toBe(true);
  });

  it('有持仓与目标时可计算偏离与摘要', () => {
    const targets: TargetAllocation[] = [
      {
        id: '1',
        instrumentId: '510300.SH',
        targetWeight: 0.8,
        allocationRole: 'core',
        updatedAt: '2024-01-01',
      },
    ];
    const flows: CashFlow[] = [
      {
        id: 'd1',
        flowDate: '2024-01-01',
        type: 'deposit',
        amount: 1000,
        amountBase: 1000,
        currency: 'CNY',
        fxRateToBase: 1,
      },
    ];
    const metrics = computeDashboardMetrics({
      settings: {
        id: 's',
        baseCurrency: 'CNY',
        relativeDriftThreshold: 0.2,
        absoluteDriftThreshold: 0.05,
        reviewCadenceDays: 90,
        cashTargetWeight: 0.2,
      },
      targets,
      positions: [pos('510300.SH', 800)],
      cashAccounts: cash(200),
      cashFlows: flows,
      snapshots: [],
      valuationDate: '2024-06-01',
    });
    expect(metrics.totals?.totalAssetsBase).toBe(1000);
    expect(metrics.drifts.length).toBeGreaterThan(0);
    expect(metrics.rebalanceDraft).not.toBeNull();
    expect(
      metrics.rebalanceDraft?.plannedTrades.every(
        trade => trade.instrumentId !== 'CASH'
      )
    ).toBe(true);
  });
});

describe('valuation date helpers', () => {
  it('多日快照取最新估值日并过滤，避免重复累加', () => {
    const positions = [
      pos('510300.SH', 100, '2024-01-01'),
      pos('510300.SH', 120, '2024-06-01'),
    ];
    const accounts = [...cash(10, '2024-01-01'), ...cash(20, '2024-06-01')];
    const latest = resolveLatestValuationDate([...positions, ...accounts]);
    expect(latest).toBe('2024-06-01');
    expect(filterLedgerAsOfDate(positions, latest)).toHaveLength(1);
    expect(filterLedgerAsOfDate(positions, latest)[0].marketValueBase).toBe(
      120
    );
    expect(filterLedgerAsOfDate(accounts, latest)[0].balanceBase).toBe(20);
  });
});
