import {
  computeDebtRatio,
  computeLedgerTotals,
  computePolicyCoverage,
  computeAssetCategoryShares,
  computeFourPotShares,
  computeMemberAssetShares,
  parseMoney,
  roundMoney,
} from '@/lib/family-finance/aggregates';
import type { InsurancePolicy } from '@/types/family-finance';

describe('family-finance aggregates', () => {
  it('roundMoney / parseMoney 保持两位小数', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(parseMoney('1234.567')).toBe(1234.57);
    expect(parseMoney(null)).toBe(0);
  });

  it('computeLedgerTotals 正确汇总净资产', () => {
    const totals = computeLedgerTotals([
      { side: 'asset', amount: 1000 },
      { side: 'asset', amount: 500.25 },
      { side: 'liability', amount: 200.1 },
    ]);
    expect(totals.totalAssets).toBe(1500.25);
    expect(totals.totalLiabilities).toBe(200.1);
    expect(totals.netWorth).toBe(1300.15);
  });

  it('computeDebtRatio 在资产为 0 时返回 null', () => {
    expect(computeDebtRatio({ totalAssets: 0, totalLiabilities: 10, netWorth: -10 })).toBeNull();
    expect(computeDebtRatio({ totalAssets: 100, totalLiabilities: 25, netWorth: 75 })).toBe(0.25);
  });

  it('资产分类与成员分布只统计 asset', () => {
    const shares = computeAssetCategoryShares([
      { side: 'asset', category: 'cash', amount: 60 },
      { side: 'asset', category: 'investment', amount: 40 },
      { side: 'liability', category: 'mortgage', amount: 100 },
    ]);
    expect(shares).toHaveLength(2);
    expect(shares[0].category).toBe('cash');
    expect(shares[0].ratio).toBeCloseTo(0.6);

    const members = computeMemberAssetShares(
      [
        { side: 'asset', memberId: 'm1', amount: 70 },
        { side: 'asset', memberId: 'm2', amount: 30 },
        { side: 'liability', memberId: null, amount: 50 },
      ],
      new Map([
        ['m1', '我'],
        ['m2', '配偶'],
      ])
    );
    expect(members[0].memberName).toBe('我');
    expect(members[0].ratio).toBeCloseTo(0.7);
  });

  it('四笔钱结构只聚合活钱/稳钱/长钱，忽略 insurance 与未标注', () => {
    const shares = computeFourPotShares([
      { side: 'asset', fourPot: 'liquid', amount: 30 },
      { side: 'asset', fourPot: 'stable', amount: 50 },
      { side: 'asset', fourPot: 'long_term', amount: 20 },
      { side: 'asset', fourPot: 'insurance', amount: 99 },
      { side: 'asset', fourPot: null, amount: 88 },
      { side: 'liability', fourPot: 'liquid', amount: 100 },
    ]);
    expect(shares.map(s => s.fourPot)).toEqual(['liquid', 'stable', 'long_term']);
    expect(shares.find(s => s.fourPot === 'liquid')?.ratio).toBeCloseTo(0.3);
    expect(shares.find(s => s.fourPot === 'stable')?.ratio).toBeCloseTo(0.5);
    expect(shares.find(s => s.fourPot === 'long_term')?.ratio).toBeCloseTo(0.2);
  });

  it('四笔钱结构在仅有 insurance/未标注时为空', () => {
    expect(
      computeFourPotShares([
        { side: 'asset', fourPot: 'insurance', amount: 10 },
        { side: 'asset', fourPot: null, amount: 20 },
      ])
    ).toEqual([]);
  });

  it('四笔钱结构过滤金额为 0 的桶', () => {
    const shares = computeFourPotShares([
      { side: 'asset', fourPot: 'liquid', amount: 0 },
      { side: 'asset', fourPot: 'stable', amount: 100 },
      { side: 'asset', fourPot: 'long_term', amount: 0 },
    ]);
    expect(shares).toEqual([{ fourPot: 'stable', amount: 100, ratio: 1 }]);
  });

  it('保单覆盖只看 active，且不读保额', () => {
    const policies = [
      {
        id: '1',
        userId: 'u',
        memberId: 'm',
        policyType: 'life',
        insurer: null,
        name: '寿险',
        coverageAmount: 1_000_000,
        annualPremium: 8000,
        status: 'active',
        startDate: null,
        endDate: null,
        note: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        userId: 'u',
        memberId: 'm',
        policyType: 'medical',
        insurer: null,
        name: '医疗',
        coverageAmount: 500_000,
        annualPremium: 3000,
        status: 'lapsed',
        startDate: null,
        endDate: null,
        note: null,
        createdAt: '',
        updatedAt: '',
      },
    ] as InsurancePolicy[];
    const coverage = computePolicyCoverage(policies);
    expect(coverage.find(c => c.policyType === 'life')?.covered).toBe(true);
    expect(coverage.find(c => c.policyType === 'medical')?.covered).toBe(false);
    expect(coverage.map(c => c.policyType)).toEqual([
      'life',
      'critical_illness',
      'medical',
      'accident',
    ]);
    expect(coverage.some(c => c.policyType === 'property')).toBe(false);
    expect(coverage.some(c => c.policyType === 'other')).toBe(false);
  });
});
