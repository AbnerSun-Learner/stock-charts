/**
 * 资产条目间金额转移（纯函数）。
 */

import type { FamilyLedgerItem, FamilyMember } from '@/types/family-finance';
import { roundMoney } from '@/lib/family-finance/aggregates';
import { formatCny } from '@/lib/family-finance/format';

export interface LedgerTransferResult {
  sourceAfter: number;
  targetAfter: number;
}

/**
 * 校验并计算转移后两侧余额；源余额可为 0（不删除条目）。
 */
export function computeLedgerTransfer(params: {
  sourceAmount: number;
  targetAmount: number;
  transferAmount: number;
}): LedgerTransferResult {
  const sourceAmount = roundMoney(params.sourceAmount);
  const targetAmount = roundMoney(params.targetAmount);
  const transferAmount = roundMoney(params.transferAmount);

  if (!(transferAmount > 0)) {
    throw new Error('转移金额必须大于 0');
  }
  if (transferAmount > sourceAmount) {
    throw new Error('转移金额不能超过当前余额');
  }

  return {
    sourceAfter: roundMoney(sourceAmount - transferAmount),
    targetAfter: roundMoney(targetAmount + transferAmount),
  };
}

/**
 * 转移目标下拉文案：名称 · 成员 · 金额。
 */
export function formatTransferTargetLabel(
  item: FamilyLedgerItem,
  memberNameById: Map<string, string>
): string {
  const memberName =
    item.memberId != null ? (memberNameById.get(item.memberId) ?? '未知成员') : '—';
  return `${item.name} · ${memberName} · ${formatCny(item.amount)}`;
}

/**
 * 可选转移目标：其他资产条目（含金额 0），排除源条目。
 */
export function listTransferTargetOptions(params: {
  items: FamilyLedgerItem[];
  members: FamilyMember[];
  sourceId: string;
}): Array<{ value: string; label: string }> {
  const { items, members, sourceId } = params;
  const memberNameById = new Map(members.map(m => [m.id, m.name]));

  return items
    .filter(item => item.side === 'asset' && item.id !== sourceId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    .map(item => ({
      value: item.id,
      label: formatTransferTargetLabel(item, memberNameById),
    }));
}
