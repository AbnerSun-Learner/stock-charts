import {
  filterBalanceSnapshots,
  toBalanceTrendSeries,
} from '@/lib/family-finance/balance-trend';
import type {
  BalanceTrendRange,
  FamilyBalanceSnapshot,
} from '@/types/family-finance';

const sample: FamilyBalanceSnapshot[] = [
  {
    date: '2026-01-01',
    totalAssets: 100,
    totalLiabilities: 40,
    netWorth: 60,
  },
  {
    date: '2026-04-25',
    totalAssets: 110,
    totalLiabilities: 45,
    netWorth: 65,
  },
  {
    date: '2026-07-24',
    totalAssets: 120,
    totalLiabilities: 50,
    netWorth: 70,
  },
];

describe('filterBalanceSnapshots', () => {
  const asOf = '2026-07-24';

  it('all 返回全部并按日期升序', () => {
    const shuffled = [sample[2], sample[0], sample[1]];
    expect(filterBalanceSnapshots(shuffled, 'all', asOf).map(p => p.date)).toEqual([
      '2026-01-01',
      '2026-04-25',
      '2026-07-24',
    ]);
  });

  it('90d 保留 asOf 往前 90 天（含边界日）', () => {
    // 2026-07-24 往前 90 天 = 2026-04-25
    const filtered = filterBalanceSnapshots(sample, '90d', asOf);
    expect(filtered.map(p => p.date)).toEqual(['2026-04-25', '2026-07-24']);
  });

  it('1y 保留 asOf 往前 365 天（含边界日）', () => {
    const filtered = filterBalanceSnapshots(sample, '1y', asOf);
    expect(filtered.map(p => p.date)).toEqual([
      '2026-01-01',
      '2026-04-25',
      '2026-07-24',
    ]);
  });

  it('窗口内无点时返回空数组', () => {
    const onlyOld: FamilyBalanceSnapshot[] = [
      {
        date: '2025-01-01',
        totalAssets: 1,
        totalLiabilities: 0,
        netWorth: 1,
      },
    ];
    expect(filterBalanceSnapshots(onlyOld, '90d', asOf)).toEqual([]);
  });
});

describe('toBalanceTrendSeries', () => {
  it('每个快照展开为总资产/总负债/净资产三条', () => {
    const series = toBalanceTrendSeries([sample[2]]);
    expect(series).toEqual([
      { date: '2026-07-24', type: '总资产', amount: 120 },
      { date: '2026-07-24', type: '总负债', amount: 50 },
      { date: '2026-07-24', type: '净资产', amount: 70 },
    ]);
  });
});

describe('BalanceTrendRange 契约', () => {
  it('仅允许三种范围字面量', () => {
    const ranges: BalanceTrendRange[] = ['90d', '1y', 'all'];
    expect(ranges).toHaveLength(3);
  });
});
