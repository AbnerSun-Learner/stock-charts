import { buildFamilyAssetHistory } from '@/lib/family-finance/history';
import type { FamilyAssetHistoryRow } from '@/types/family-finance';

describe('buildFamilyAssetHistory', () => {
  it('将每位成员拆成独立图表，并保留三笔钱折线', () => {
    const rows: FamilyAssetHistoryRow[] = [
      {
        date: '2026-07-23',
        memberId: 'm2',
        memberName: '配偶',
        sortOrder: 10,
        fourPot: 'stable',
        potOrder: 1,
        totalAssets: 40,
      },
      {
        date: '2026-07-22',
        memberId: 'm1',
        memberName: '我',
        sortOrder: 0,
        fourPot: 'liquid',
        potOrder: 0,
        totalAssets: 70,
      },
      {
        date: '2026-07-22',
        memberId: 'm2',
        memberName: '配偶',
        sortOrder: 10,
        fourPot: 'stable',
        potOrder: 1,
        totalAssets: 30,
      },
      {
        date: '2026-07-23',
        memberId: 'm1',
        memberName: '我',
        sortOrder: 0,
        fourPot: 'liquid',
        potOrder: 0,
        totalAssets: 80,
      },
    ];

    const history = buildFamilyAssetHistory(rows);

    expect(history.map(series => series.memberName)).toEqual(['我', '配偶']);
    expect(history[0].points).toEqual([
      { date: '2026-07-22', amount: 70, fourPot: 'liquid', potOrder: 0 },
      {
        date: '2026-07-23',
        amount: 80,
        fourPot: 'liquid',
        potOrder: 0,
        latestHouseholdAmount: 80,
        latestShareRatio: 1,
      },
    ]);
    expect(history[1].points).toEqual([
      { date: '2026-07-22', amount: 30, fourPot: 'stable', potOrder: 1 },
      {
        date: '2026-07-23',
        amount: 40,
        fourPot: 'stable',
        potOrder: 1,
        latestHouseholdAmount: 40,
        latestShareRatio: 1,
      },
    ]);
  });

  it('某类笔钱晚于成员图起始日出现时，更早快照日补 amount 为 0', () => {
    const history = buildFamilyAssetHistory([
      {
        date: '2026-07-22',
        memberId: 'm1',
        memberName: '我',
        sortOrder: 0,
        fourPot: 'liquid',
        potOrder: 0,
        totalAssets: 10,
      },
      {
        date: '2026-07-22',
        memberId: 'm1',
        memberName: '我',
        sortOrder: 0,
        fourPot: 'stable',
        potOrder: 1,
        totalAssets: 20,
      },
      {
        date: '2026-07-30',
        memberId: 'm1',
        memberName: '我',
        sortOrder: 0,
        fourPot: 'liquid',
        potOrder: 0,
        totalAssets: 10,
      },
      {
        date: '2026-07-30',
        memberId: 'm1',
        memberName: '我',
        sortOrder: 0,
        fourPot: 'stable',
        potOrder: 1,
        totalAssets: 20,
      },
      {
        date: '2026-07-30',
        memberId: 'm1',
        memberName: '我',
        sortOrder: 0,
        fourPot: 'long_term',
        potOrder: 2,
        totalAssets: 100,
      },
    ]);

    expect(history[0].points).toEqual([
      { date: '2026-07-22', amount: 10, fourPot: 'liquid', potOrder: 0 },
      { date: '2026-07-22', amount: 20, fourPot: 'stable', potOrder: 1 },
      { date: '2026-07-22', amount: 0, fourPot: 'long_term', potOrder: 2 },
      {
        date: '2026-07-30',
        amount: 10,
        fourPot: 'liquid',
        potOrder: 0,
        latestHouseholdAmount: 10,
        latestShareRatio: 1,
      },
      {
        date: '2026-07-30',
        amount: 20,
        fourPot: 'stable',
        potOrder: 1,
        latestHouseholdAmount: 20,
        latestShareRatio: 1,
      },
      {
        date: '2026-07-30',
        amount: 100,
        fourPot: 'long_term',
        potOrder: 2,
        latestHouseholdAmount: 100,
        latestShareRatio: 1,
      },
    ]);
  });

  it('保留金额为 0 的成员历史点', () => {
    const history = buildFamilyAssetHistory([
      {
        date: '2026-07-22',
        memberId: 'm1',
        memberName: '我',
        sortOrder: 0,
        fourPot: 'long_term',
        potOrder: 2,
        totalAssets: 0,
      },
    ]);

    expect(history[0].points).toEqual([
      {
        date: '2026-07-22',
        amount: 0,
        fourPot: 'long_term',
        potOrder: 2,
        latestHouseholdAmount: 0,
        latestShareRatio: null,
      },
    ]);
  });

  it('仅在最新日期计算成员占家庭同类资产的占比', () => {
    const history = buildFamilyAssetHistory([
      {
        date: '2026-07-22',
        memberId: 'm1',
        memberName: '我',
        sortOrder: 0,
        fourPot: 'stable',
        potOrder: 1,
        totalAssets: 5,
      },
      {
        date: '2026-07-22',
        memberId: 'm2',
        memberName: '配偶',
        sortOrder: 1,
        fourPot: 'stable',
        potOrder: 1,
        totalAssets: 5,
      },
      {
        date: '2026-07-23',
        memberId: 'm1',
        memberName: '我',
        sortOrder: 0,
        fourPot: 'stable',
        potOrder: 1,
        totalAssets: 10,
      },
      {
        date: '2026-07-23',
        memberId: 'm2',
        memberName: '配偶',
        sortOrder: 1,
        fourPot: 'stable',
        potOrder: 1,
        totalAssets: 30,
      },
    ]);

    expect(history[0].points[0]).not.toHaveProperty('latestShareRatio');
    expect(history[0].points[1]).toMatchObject({
      latestHouseholdAmount: 40,
      latestShareRatio: 0.25,
    });
    expect(history[1].points[1]).toMatchObject({
      latestHouseholdAmount: 40,
      latestShareRatio: 0.75,
    });
  });
});
