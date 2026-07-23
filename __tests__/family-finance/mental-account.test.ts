import type { FamilyLedgerItem, FamilyMember, FamilyMentalAccount } from '@/types/family-finance';
import {
  computeMentalAccountProgress,
  formatMentalLedgerOptionLabel,
  listSelectableMentalLedgerItems,
} from '@/lib/family-finance/mental-account';

function ledger(
  partial: Partial<FamilyLedgerItem> & Pick<FamilyLedgerItem, 'id' | 'amount' | 'fourPot'>
): FamilyLedgerItem {
  return {
    userId: 'u1',
    memberId: 'm1',
    side: 'asset',
    category: 'cash',
    name: '账目',
    currency: 'CNY',
    note: null,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

function account(
  partial: Partial<FamilyMentalAccount> & Pick<FamilyMentalAccount, 'id' | 'ledgerItemIds'>
): FamilyMentalAccount {
  return {
    userId: 'u1',
    name: '应急金',
    targetAmount: 10000,
    targetDate: '2026-12-31',
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

describe('computeMentalAccountProgress', () => {
  it('按关联的活钱/稳钱/长钱合计计算进度与超额', () => {
    const items = [
      ledger({ id: 'a', amount: 3000, fourPot: 'liquid', name: '活期' }),
      ledger({ id: 'b', amount: 4000, fourPot: 'stable', name: '国债' }),
      ledger({ id: 'c', amount: 4000, fourPot: 'long_term', name: '股票' }),
      ledger({ id: 'd', amount: 9999, fourPot: 'insurance', name: '保险金' }),
    ];
    const result = computeMentalAccountProgress(
      account({ id: 'ma1', targetAmount: 10000, ledgerItemIds: ['a', 'b', 'c', 'd'] }),
      items
    );
    expect(result.current).toBe(11000);
    expect(result.percent).toBeCloseTo(1.1);
    expect(result.chartPercent).toBe(1);
    expect(result.overflow).toBe(1000);
  });

  it('忽略已删除、insurance 或未标注四笔钱的关联', () => {
    const result = computeMentalAccountProgress(
      account({ id: 'ma1', targetAmount: 10000, ledgerItemIds: ['gone', 'x', 'y'] }),
      [
        ledger({ id: 'x', amount: 3000, fourPot: 'insurance' }),
        ledger({ id: 'y', amount: 2000, fourPot: null }),
      ]
    );
    expect(result.current).toBe(0);
    expect(result.percent).toBe(0);
    expect(result.chartPercent).toBe(0);
    expect(result.overflow).toBe(0);
  });

  it('目标非法时进度为 0', () => {
    const result = computeMentalAccountProgress(
      account({ id: 'ma1', targetAmount: 0, ledgerItemIds: ['a'] }),
      [ledger({ id: 'a', amount: 100, fourPot: 'liquid' })]
    );
    expect(result.percent).toBe(0);
    expect(result.chartPercent).toBe(0);
  });
});

describe('listSelectableMentalLedgerItems', () => {
  const members: FamilyMember[] = [
    {
      id: 'm1',
      userId: 'u1',
      name: '我',
      role: 'self',
      sortOrder: 0,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const items = [
    ledger({ id: 'l1', amount: 1000, fourPot: 'liquid', name: '招商活期', memberId: 'm1' }),
    ledger({ id: 'l2', amount: 2000, fourPot: 'stable', name: '国债', memberId: 'm1' }),
    ledger({ id: 'l3', amount: 3000, fourPot: 'long_term', name: '指数基金', memberId: 'm1' }),
    ledger({ id: 'l4', amount: 4000, fourPot: 'insurance', name: '保险金', memberId: 'm1' }),
  ];

  it('返回未被占用的活钱/稳钱/长钱，排除 insurance', () => {
    const accounts = [account({ id: 'ma1', ledgerItemIds: ['l1'] })];
    const selectable = listSelectableMentalLedgerItems({
      items,
      members,
      allAccounts: accounts,
      editingAccountId: null,
    });
    expect(selectable.map(s => s.id).sort()).toEqual(['l2', 'l3']);
  });

  it('编辑时保留本账户已关联条目', () => {
    const accounts = [account({ id: 'ma1', ledgerItemIds: ['l1'] })];
    const selectable = listSelectableMentalLedgerItems({
      items,
      members,
      allAccounts: accounts,
      editingAccountId: 'ma1',
    });
    expect(selectable.map(s => s.id).sort()).toEqual(['l1', 'l2', 'l3']);
  });
});

describe('formatMentalLedgerOptionLabel', () => {
  it('包含账目名、成员、四笔钱标签与金额', () => {
    const label = formatMentalLedgerOptionLabel(
      ledger({ id: 'l1', amount: 1234.5, fourPot: 'stable', name: '国债', memberId: 'm1' }),
      new Map([['m1', '我']])
    );
    expect(label).toContain('国债');
    expect(label).toContain('我');
    expect(label).toContain('稳钱');
    expect(label).toMatch(/¥|￥|1,234/);
  });
});
