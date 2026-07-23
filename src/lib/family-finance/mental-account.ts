import type {
  FamilyLedgerItem,
  FamilyMember,
  FamilyMentalAccount,
  MentalAccountProgress,
  SelectableMentalLedgerItem,
} from '@/types/family-finance';
import { FOUR_POT_LABELS } from '@/types/family-finance';
import { isStructureFourPot, roundMoney } from '@/lib/family-finance/aggregates';
import { formatCny } from '@/lib/family-finance/format';

/**
 * 计算心理账户进度：计入仍存在且标注为活钱/稳钱/长钱的关联条目。
 */
export function computeMentalAccountProgress(
  account: FamilyMentalAccount,
  items: FamilyLedgerItem[]
): MentalAccountProgress {
  const byId = new Map(items.map(item => [item.id, item]));
  let current = 0;
  for (const id of account.ledgerItemIds) {
    const item = byId.get(id);
    if (!item || item.side !== 'asset' || !isStructureFourPot(item.fourPot)) continue;
    current = roundMoney(current + item.amount);
  }

  const target = account.targetAmount;
  if (!(target > 0)) {
    return { current, percent: 0, chartPercent: 0, overflow: 0 };
  }

  const percent = current / target;
  return {
    current,
    percent,
    chartPercent: Math.min(1, Math.max(0, percent)),
    overflow: roundMoney(Math.max(0, current - target)),
  };
}

/**
 * 多选选项文案：账目名 · 成员 · 四笔钱 · 金额。
 */
export function formatMentalLedgerOptionLabel(
  item: FamilyLedgerItem,
  memberNameById: Map<string, string>
): string {
  const memberName =
    item.memberId != null ? (memberNameById.get(item.memberId) ?? '未知成员') : '家庭';
  const potLabel =
    item.fourPot != null && isStructureFourPot(item.fourPot)
      ? FOUR_POT_LABELS[item.fourPot]
      : '未标注';
  return `${item.name} · ${memberName} · ${potLabel} · ${formatCny(item.amount)}`;
}

/**
 * 可选账目列表：活钱/稳钱/长钱；排除其他心理账户已占用；编辑时保留本账户关联。
 */
export function listSelectableMentalLedgerItems(params: {
  items: FamilyLedgerItem[];
  members: FamilyMember[];
  allAccounts: FamilyMentalAccount[];
  editingAccountId: string | null;
}): SelectableMentalLedgerItem[] {
  const { items, members, allAccounts, editingAccountId } = params;
  const memberNameById = new Map(members.map(m => [m.id, m.name]));

  const occupied = new Set<string>();
  for (const acc of allAccounts) {
    if (editingAccountId != null && acc.id === editingAccountId) continue;
    for (const id of acc.ledgerItemIds) occupied.add(id);
  }

  return items
    .filter(
      item =>
        item.side === 'asset' &&
        isStructureFourPot(item.fourPot) &&
        !occupied.has(item.id)
    )
    .map(item => ({
      id: item.id,
      label: formatMentalLedgerOptionLabel(item, memberNameById),
      amount: item.amount,
    }));
}
