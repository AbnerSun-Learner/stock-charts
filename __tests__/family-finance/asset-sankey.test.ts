import type { FamilyLedgerItem, FamilyMember } from '@/types/family-finance';
import {
  buildFamilyAssetSankeyLinks,
  hasSankeyLiabilityHub,
  isSankeyHubNode,
} from '@/lib/family-finance/asset-sankey';

function asset(
  partial: Partial<FamilyLedgerItem> &
    Pick<FamilyLedgerItem, 'id' | 'name' | 'amount' | 'fourPot' | 'memberId'>
): FamilyLedgerItem {
  return {
    userId: 'u1',
    side: 'asset',
    category: 'cash',
    currency: 'CNY',
    note: null,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

function liability(
  partial: Partial<FamilyLedgerItem> & Pick<FamilyLedgerItem, 'id' | 'name' | 'amount'>
): FamilyLedgerItem {
  return {
    userId: 'u1',
    memberId: null,
    side: 'liability',
    category: 'mortgage',
    currency: 'CNY',
    fourPot: null,
    note: null,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

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
  {
    id: 'm2',
    userId: 'u1',
    name: '配偶',
    role: 'spouse',
    sortOrder: 1,
    createdAt: '',
    updatedAt: '',
  },
];

describe('buildFamilyAssetSankeyLinks', () => {
  it('构建 负债/净资产→总资产→四笔钱→条目 的边，标签含金额', () => {
    const items = [
      liability({ id: 'd1', name: '房贷', amount: 40 }),
      asset({ id: 'a1', name: '活期', amount: 30, fourPot: 'liquid', memberId: 'm1' }),
      asset({ id: 'a2', name: '国债', amount: 70, fourPot: 'stable', memberId: 'm2' }),
    ];
    const links = buildFamilyAssetSankeyLinks(items, members);

    expect(links.some(l => l.source.includes('房贷') && l.source.includes('¥') && l.target.startsWith('负债'))).toBe(
      true
    );
    expect(links.some(l => l.source.startsWith('负债') && l.target.startsWith('总资产') && l.value === 40)).toBe(
      true
    );
    expect(links.some(l => l.source.startsWith('净资产') && l.target.startsWith('总资产') && l.value === 60)).toBe(
      true
    );
    expect(links.some(l => l.source.startsWith('总资产') && l.target.startsWith('活钱') && l.value === 30)).toBe(
      true
    );
    expect(links.some(l => l.source.startsWith('稳钱') && l.target.includes('国债') && l.target.includes('配偶'))).toBe(
      true
    );
  });

  it('净资产≤0 时不画净资产边；跳过无四笔钱资产', () => {
    const items = [
      liability({ id: 'd1', name: '房贷', amount: 100 }),
      asset({ id: 'a1', name: '活期', amount: 30, fourPot: 'liquid', memberId: 'm1' }),
      asset({ id: 'a2', name: '未标', amount: 20, fourPot: null, memberId: 'm1' }),
    ];
    const links = buildFamilyAssetSankeyLinks(items, members);
    expect(links.some(l => l.source.startsWith('净资产'))).toBe(false);
    expect(links.some(l => l.target.includes('未标'))).toBe(false);
    expect(links.some(l => l.source.startsWith('总资产') && l.target.startsWith('活钱') && l.value === 30)).toBe(
      true
    );
  });

  it('无有效资产时返回空', () => {
    expect(buildFamilyAssetSankeyLinks([], members)).toEqual([]);
    expect(
      buildFamilyAssetSankeyLinks(
        [liability({ id: 'd1', name: '债', amount: 10 })],
        members
      )
    ).toEqual([]);
  });

  it('amountsVisible=false 时节点金额为 ****', () => {
    const items = [
      liability({ id: 'd1', name: '房贷', amount: 40 }),
      asset({ id: 'a1', name: '活期', amount: 30, fourPot: 'liquid', memberId: 'm1' }),
    ];
    const links = buildFamilyAssetSankeyLinks(items, members, { amountsVisible: false });
    expect(links.every(l => !l.source.includes('¥') && !l.target.includes('¥'))).toBe(true);
    expect(links.some(l => l.source.includes('****') || l.target.includes('****'))).toBe(true);
    expect(links.some(l => l.source.startsWith('负债') && l.target.startsWith('总资产') && l.value === 40)).toBe(
      true
    );
  });
});

describe('isSankeyHubNode / hasSankeyLiabilityHub', () => {
  it('识别负债与总资产汇总柱', () => {
    expect(isSankeyHubNode('负债 · ¥40.00')).toBe(true);
    expect(isSankeyHubNode('总资产 · ¥100.00')).toBe(true);
    expect(isSankeyHubNode('活钱 · ¥30.00')).toBe(false);
    expect(
      hasSankeyLiabilityHub([
        { source: '房贷 · ¥40.00', target: '负债 · ¥40.00', value: 40 },
        { source: '负债 · ¥40.00', target: '总资产 · ¥100.00', value: 40 },
      ])
    ).toBe(true);
  });
});
