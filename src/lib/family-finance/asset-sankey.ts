import type { FamilyLedgerItem, FamilyMember, FourPot } from '@/types/family-finance';
import { roundMoney } from '@/lib/family-finance/aggregates';
import { formatCny } from '@/lib/family-finance/format';

/** 桑基边：source/target 即节点展示名（含金额）。 */
export interface FamilyAssetSankeyLink {
  source: string;
  target: string;
  value: number;
}

const POT_ORDER: FourPot[] = ['liquid', 'stable', 'long_term', 'insurance'];

/** 桑基中间层用更短的保险标签。 */
const SANK_POT_LABELS: Record<FourPot, string> = {
  liquid: '活钱',
  stable: '稳钱',
  long_term: '长钱',
  insurance: '保险',
};

function potNodeLabel(pot: FourPot, amount: number): string {
  return `${SANK_POT_LABELS[pot]} · ${formatCny(amount)}`;
}

function liabilityItemLabel(item: FamilyLedgerItem): string {
  return `${item.name} · ${formatCny(item.amount)}`;
}

function assetItemLabel(item: FamilyLedgerItem, memberNameById: Map<string, string>): string {
  const member =
    item.memberId != null ? (memberNameById.get(item.memberId) ?? '未知成员') : '家庭';
  return `${item.name} · ${member} · ${formatCny(item.amount)}`;
}

/** 桑基汇总节点前缀（用于加宽柱与顶部标注）。 */
export const SANK_LIABILITY_HUB_PREFIX = '负债';
export const SANK_TOTAL_HUB_PREFIX = '总资产';

export function isSankeyHubNode(key: string): boolean {
  return key.startsWith(`${SANK_LIABILITY_HUB_PREFIX} ·`) || key.startsWith(`${SANK_TOTAL_HUB_PREFIX} ·`);
}

/**
 * 将活账映射为桑基边：
 * 负债条目 → 负债 → 总资产 → 四笔钱 → 资产条目；
 * 净资产（>0）→ 总资产。
 */
export function buildFamilyAssetSankeyLinks(
  items: FamilyLedgerItem[],
  members: FamilyMember[]
): FamilyAssetSankeyLink[] {
  const memberNameById = new Map(members.map(m => [m.id, m.name]));
  const assets = items.filter(
    i => i.side === 'asset' && i.fourPot != null && i.amount > 0
  );
  if (assets.length === 0) return [];

  const liabilities = items.filter(i => i.side === 'liability' && i.amount > 0);
  const totalAssets = roundMoney(assets.reduce((s, i) => s + i.amount, 0));
  const totalLiabilities = roundMoney(liabilities.reduce((s, i) => s + i.amount, 0));
  const netWorth = roundMoney(totalAssets - totalLiabilities);

  const totalNode = `${SANK_TOTAL_HUB_PREFIX} · ${formatCny(totalAssets)}`;
  const liabilityNode = `${SANK_LIABILITY_HUB_PREFIX} · ${formatCny(totalLiabilities)}`;
  const links: FamilyAssetSankeyLink[] = [];

  for (const item of liabilities) {
    links.push({
      source: liabilityItemLabel(item),
      target: liabilityNode,
      value: roundMoney(item.amount),
    });
  }

  if (totalLiabilities > 0) {
    links.push({
      source: liabilityNode,
      target: totalNode,
      value: totalLiabilities,
    });
  }

  if (netWorth > 0) {
    links.push({
      source: `净资产 · ${formatCny(netWorth)}`,
      target: totalNode,
      value: netWorth,
    });
  }

  const potSums = new Map<FourPot, number>();
  for (const pot of POT_ORDER) potSums.set(pot, 0);
  for (const item of assets) {
    const pot = item.fourPot as FourPot;
    potSums.set(pot, roundMoney((potSums.get(pot) ?? 0) + item.amount));
  }

  for (const pot of POT_ORDER) {
    const sum = potSums.get(pot) ?? 0;
    if (sum <= 0) continue;
    const potLabel = potNodeLabel(pot, sum);
    links.push({
      source: totalNode,
      target: potLabel,
      value: sum,
    });

    for (const item of assets.filter(a => a.fourPot === pot)) {
      links.push({
        source: potLabel,
        target: assetItemLabel(item, memberNameById),
        value: roundMoney(item.amount),
      });
    }
  }

  return links;
}

/** 是否存在负债汇总柱（决定顶部「负债」标注）。 */
export function hasSankeyLiabilityHub(links: FamilyAssetSankeyLink[]): boolean {
  return links.some(
    l =>
      l.source.startsWith(`${SANK_LIABILITY_HUB_PREFIX} ·`) ||
      l.target.startsWith(`${SANK_LIABILITY_HUB_PREFIX} ·`)
  );
}
