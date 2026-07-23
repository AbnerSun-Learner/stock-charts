import {
  formatMemberPieLabel,
  toMemberPieData,
} from '@/lib/family-finance/member-distribution-pie';

describe('toMemberPieData', () => {
  it('映射 MemberShare 为饼图数据', () => {
    expect(
      toMemberPieData([
        { memberId: '1', memberName: '我', amount: 1000, ratio: 0.4 },
        { memberId: '2', memberName: '配偶', amount: 1500, ratio: 0.6 },
      ])
    ).toEqual([
      { type: '我', value: 1000, ratio: 0.4 },
      { type: '配偶', value: 1500, ratio: 0.6 },
    ]);
  });
});

describe('formatMemberPieLabel', () => {
  it('包含成员名、金额与整数占比', () => {
    const label = formatMemberPieLabel({ type: '我', value: 1234.5, ratio: 0.356 });
    expect(label).toContain('我');
    expect(label).toContain('36%');
    expect(label).toMatch(/¥|￥|1,234/);
  });
});
