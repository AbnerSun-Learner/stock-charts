import {
  computeLedgerTransfer,
  formatTransferTargetLabel,
  listTransferTargetOptions,
} from '@/lib/family-finance/ledger-transfer';
import type { FamilyLedgerItem, FamilyMember } from '@/types/family-finance';

function asset(
  partial: Pick<FamilyLedgerItem, 'id' | 'name' | 'amount'> &
    Partial<Pick<FamilyLedgerItem, 'memberId'>>
): FamilyLedgerItem {
  return {
    id: partial.id,
    userId: 'u1',
    memberId: partial.memberId ?? 'm1',
    side: 'asset',
    category: 'cash',
    name: partial.name,
    amount: partial.amount,
    currency: 'CNY',
    fourPot: 'liquid',
    note: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('computeLedgerTransfer', () => {
  it('部分转移：源减目标加', () => {
    expect(
      computeLedgerTransfer({
        sourceAmount: 1000,
        targetAmount: 200,
        transferAmount: 300,
      })
    ).toEqual({ sourceAfter: 700, targetAfter: 500 });
  });

  it('整笔转空：源余额为 0（不删除）', () => {
    expect(
      computeLedgerTransfer({
        sourceAmount: 500.5,
        targetAmount: 0,
        transferAmount: 500.5,
      })
    ).toEqual({ sourceAfter: 0, targetAfter: 500.5 });
  });

  it('转移金额 ≤ 0 时报错', () => {
    expect(() =>
      computeLedgerTransfer({
        sourceAmount: 100,
        targetAmount: 0,
        transferAmount: 0,
      })
    ).toThrow('转移金额必须大于 0');
  });

  it('超过源余额时报错', () => {
    expect(() =>
      computeLedgerTransfer({
        sourceAmount: 100,
        targetAmount: 0,
        transferAmount: 100.01,
      })
    ).toThrow('转移金额不能超过当前余额');
  });
});

describe('listTransferTargetOptions', () => {
  const members: FamilyMember[] = [
    {
      id: 'm1',
      userId: 'u1',
      name: '本人',
      role: 'self',
      sortOrder: 0,
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('排除源条目，保留金额为 0 的目标', () => {
    const items = [
      asset({ id: 'a', name: '现金', amount: 100 }),
      asset({ id: 'b', name: '空壳', amount: 0 }),
      {
        ...asset({ id: 'c', name: '房贷', amount: 10 }),
        side: 'liability' as const,
        category: 'mortgage' as const,
        memberId: null,
        fourPot: null,
      },
    ];
    const options = listTransferTargetOptions({
      items,
      members,
      sourceId: 'a',
    });
    expect(options.map(o => o.value)).toEqual(['b']);
    expect(options[0].label).toContain('空壳');
    expect(options[0].label).toContain('¥0.00');
  });

  it('formatTransferTargetLabel 含成员与金额', () => {
    const label = formatTransferTargetLabel(
      asset({ id: 'a', name: '活期', amount: 12.3, memberId: 'm1' }),
      new Map([['m1', '本人']])
    );
    expect(label).toBe('活期 · 本人 · ¥12.30');
  });
});
