import {
  applyPositionImportKeepingTargets,
  calculatePortfolioTotals,
  detectPositionTradeShareDiff,
  validateTargetAllocationWeights,
} from '@/lib/investment/portfolio';
import type { CashAccount, Position, TargetAllocation } from '@/types/investment';

const targets = (
  rows: Array<Pick<TargetAllocation, 'instrumentId' | 'targetWeight' | 'allocationRole'>>
): TargetAllocation[] =>
  rows.map((row, index) => ({
    id: String(index),
    updatedAt: '2024-01-01',
    ...row,
  }));

const position = (partial: Partial<Position> & Pick<Position, 'instrumentId' | 'marketValueBase'>): Position => ({
  id: partial.instrumentId,
  asOfDate: '2024-01-01',
  shares: 100,
  averageCost: 1,
  currency: 'CNY',
  fxRateToBase: 1,
  ...partial,
});

const cash = (balanceBase: number): CashAccount[] => [
  {
    id: 'cny',
    currency: 'CNY',
    asOfDate: '2024-01-01',
    balance: balanceBase,
    fxRateToBase: 1,
    balanceBase,
  },
];

describe('portfolio', () => {
  it('校验目标权重：sum(标的)+cashTargetWeight=1，watch=0', () => {
    const ok = validateTargetAllocationWeights(
      targets([
        {
          instrumentId: '510300.SH',
          targetWeight: 0.6,
          allocationRole: 'core',
        },
        {
          instrumentId: '159915.SZ',
          targetWeight: 0.3,
          allocationRole: 'satellite',
        },
        {
          instrumentId: '515000.SH',
          targetWeight: 0,
          allocationRole: 'watch',
        },
      ]),
      0.1
    );
    expect(ok.ok).toBe(true);

    const badWatch = validateTargetAllocationWeights(
      targets([
        {
          instrumentId: '510300.SH',
          targetWeight: 0.1,
          allocationRole: 'watch',
        },
      ]),
      0.9
    );
    expect(badWatch.errors).toContain('watch_nonzero');

    const badSum = validateTargetAllocationWeights(
      targets([
        {
          instrumentId: '510300.SH',
          targetWeight: 0.5,
          allocationRole: 'core',
        },
      ]),
      0.4
    );
    expect(badSum.errors).toContain('sum_not_one');
  });

  it('禁止虚拟现金码进入目标配置', () => {
    const result = validateTargetAllocationWeights(
      targets([
        { instrumentId: 'CASH', targetWeight: 0.2, allocationRole: 'core' },
      ]),
      0.8
    );
    expect(result.errors).toEqual(
      expect.arrayContaining(['virtual_cash_code', 'invalid_instrument_id'])
    );
  });

  it('计算总资产与现金比例', () => {
    const result = calculatePortfolioTotals(
      [
        position({ instrumentId: '510300.SH', marketValueBase: 700 }),
        position({ instrumentId: '159915.SZ', marketValueBase: 200 }),
      ],
      cash(100)
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.totalAssetsBase).toBe(1000);
    expect(result.value.cashRatio).toBe(0.1);
  });

  it('持仓快照与账本份额差异不得静默覆盖', () => {
    const diffs = detectPositionTradeShareDiff({
      ledgerSharesByInstrument: { '510300.SH': 100 },
      snapshotPositions: [
        position({
          instrumentId: '510300.SH',
          marketValueBase: 1000,
          shares: 120,
        }),
      ],
    });
    expect(diffs).toHaveLength(1);
    expect(diffs[0].snapshotShares).toBe(120);
  });

  it('导入持仓不得覆盖 target_allocations', () => {
    const existingTargets = targets([
      {
        instrumentId: '510300.SH',
        targetWeight: 0.8,
        allocationRole: 'core',
      },
    ]);
    const imported = [
      position({ instrumentId: '510300.SH', marketValueBase: 1, shares: 1 }),
    ];
    const result = applyPositionImportKeepingTargets({
      existingTargets,
      importedPositions: imported,
    });
    expect(result.targets).toBe(existingTargets);
    expect(result.positions).toEqual(imported);
  });
});
