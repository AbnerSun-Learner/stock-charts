/**
 * 家庭财务聚合纯函数（输入仅为 ledger 金额；不含保单保额）。
 */

import type {
  CategoryShare,
  FourPot,
  FourPotShare,
  InsurancePolicy,
  LedgerTotals,
  MemberShare,
  PolicyCoverageSummary,
  PolicyType,
  StructureFourPot,
} from '@/types/family-finance';
import { COVERAGE_POLICY_TYPES, STRUCTURE_FOUR_POTS } from '@/types/family-finance';

/** 将数值规范为两位小数（定点数语义）。 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** 解析 DB numeric / 字符串金额为 number。 */
export function parseMoney(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  return roundMoney(n);
}

type AmountSide = { side: 'asset' | 'liability'; amount: number };

/** 汇总资产 / 负债 / 净资产。 */
export function computeLedgerTotals(items: AmountSide[]): LedgerTotals {
  let totalAssets = 0;
  let totalLiabilities = 0;
  for (const item of items) {
    const amount = roundMoney(item.amount);
    if (item.side === 'asset') totalAssets = roundMoney(totalAssets + amount);
    else totalLiabilities = roundMoney(totalLiabilities + amount);
  }
  return {
    totalAssets,
    totalLiabilities,
    netWorth: roundMoney(totalAssets - totalLiabilities),
  };
}

/** 负债率；总资产为 0 时返回 null。 */
export function computeDebtRatio(totals: LedgerTotals): number | null {
  if (totals.totalAssets <= 0) return null;
  return totals.totalLiabilities / totals.totalAssets;
}

/** 资产分类占比（仅 asset 侧）。 */
export function computeAssetCategoryShares(
  items: Array<{ side: 'asset' | 'liability'; category: string; amount: number }>
): CategoryShare[] {
  const assets = items.filter(i => i.side === 'asset');
  const totals = computeLedgerTotals(assets);
  if (totals.totalAssets <= 0) return [];

  const map = new Map<string, number>();
  for (const item of assets) {
    map.set(item.category, roundMoney((map.get(item.category) ?? 0) + item.amount));
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({
      category: category as CategoryShare['category'],
      amount,
      ratio: amount / totals.totalAssets,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function isStructureFourPot(pot: FourPot | null): pot is StructureFourPot {
  return pot === 'liquid' || pot === 'stable' || pot === 'long_term';
}

export { isStructureFourPot };

/**
 * 资产结构占比：按活钱 / 稳钱 / 长钱聚合（仅 asset；不含 insurance 与未标注）。
 * 占比分母为三笔钱合计，保证饼图切片之和为 100%。
 */
export function computeFourPotShares(
  items: Array<{ side: 'asset' | 'liability'; fourPot: FourPot | null; amount: number }>
): FourPotShare[] {
  const map = new Map<StructureFourPot, number>(
    STRUCTURE_FOUR_POTS.map(pot => [pot, 0])
  );
  for (const item of items) {
    if (item.side !== 'asset' || !isStructureFourPot(item.fourPot)) continue;
    map.set(item.fourPot, roundMoney((map.get(item.fourPot) ?? 0) + item.amount));
  }
  const potTotal = roundMoney(
    STRUCTURE_FOUR_POTS.reduce((sum, pot) => sum + (map.get(pot) ?? 0), 0)
  );
  if (potTotal <= 0) return [];

  return STRUCTURE_FOUR_POTS.filter(pot => (map.get(pot) ?? 0) > 0).map(fourPot => {
    const amount = map.get(fourPot) ?? 0;
    return { fourPot, amount, ratio: amount / potTotal };
  });
}

/** 成员资产分布（仅 asset；负债不参与）。 */
export function computeMemberAssetShares(
  items: Array<{
    side: 'asset' | 'liability';
    memberId: string | null;
    memberName?: string | null;
    amount: number;
  }>,
  memberNameById: Map<string, string>
): MemberShare[] {
  const assets = items.filter(i => i.side === 'asset');
  const totals = computeLedgerTotals(assets);
  if (totals.totalAssets <= 0) return [];

  const map = new Map<string, { name: string; amount: number }>();
  for (const item of assets) {
    const key = item.memberId ?? '__unknown__';
    const name =
      item.memberName ??
      (item.memberId ? memberNameById.get(item.memberId) ?? '未知成员' : '未知成员');
    const prev = map.get(key);
    map.set(key, {
      name,
      amount: roundMoney((prev?.amount ?? 0) + item.amount),
    });
  }
  return Array.from(map.entries())
    .map(([memberId, v]) => ({
      memberId: memberId === '__unknown__' ? null : memberId,
      memberName: v.name,
      amount: v.amount,
      ratio: v.amount / totals.totalAssets,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** 保单覆盖摘要（仅看 active）；与四笔钱无关、不读保额。 */
export function computePolicyCoverage(policies: InsurancePolicy[]): PolicyCoverageSummary[] {
  const active = new Set(
    policies.filter(p => p.status === 'active').map(p => p.policyType)
  );
  return COVERAGE_POLICY_TYPES.map((policyType: PolicyType) => ({
    policyType,
    covered: active.has(policyType),
  }));
}
