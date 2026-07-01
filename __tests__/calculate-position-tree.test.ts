import {
  appendCashToChartNodes,
  buildCashPositionNode,
  calculatePositionTree,
  getUnallocatedAmount,
  roundAmount,
  sumAllocatedAmount,
} from '@/utils/calculate-position-tree';
import { CASH_LEAF_PATH, POSITION_CATEGORY_TREE } from '@/utils/position-category-tree';

function findByPath(
  nodes: ReturnType<typeof calculatePositionTree>['nodes'],
  path: string
): { amount: number; percentage: string } | undefined {
  for (const node of nodes) {
    if (node.path === path) {
      return { amount: node.amount, percentage: node.percentage };
    }
    if (node.children) {
      const found = findByPath(node.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

describe('calculatePositionTree', () => {
  it('按用户示例计算占比：100万 + 红利/传媒/医药各20万', () => {
    const { nodes, warnings } = calculatePositionTree(POSITION_CATEGORY_TREE, {
      totalInvestment: 1_000_000,
      leafAmounts: {
        'A股/价值/红利': 200_000,
        'A股/行业/传媒': 200_000,
        'A股/行业/医药': 200_000,
      },
    });

    expect(warnings).toHaveLength(0);
    expect(findByPath(nodes, 'A股/价值/红利')).toEqual({
      amount: 200_000,
      percentage: '20.00%',
    });
    expect(findByPath(nodes, 'A股/行业/传媒')).toEqual({
      amount: 200_000,
      percentage: '20.00%',
    });
    expect(findByPath(nodes, 'A股/行业/医药')).toEqual({
      amount: 200_000,
      percentage: '20.00%',
    });
    expect(findByPath(nodes, 'A股/价值')).toEqual({
      amount: 200_000,
      percentage: '20.00%',
    });
    expect(findByPath(nodes, 'A股/行业')).toEqual({
      amount: 400_000,
      percentage: '40.00%',
    });
    expect(findByPath(nodes, 'A股')).toEqual({
      amount: 600_000,
      percentage: '60.00%',
    });
  });

  it('总投资为 0 时占比为 0.00%', () => {
    const { nodes } = calculatePositionTree(POSITION_CATEGORY_TREE, {
      totalInvestment: 0,
      leafAmounts: { 'A股/价值/红利': 100 },
    });
    expect(findByPath(nodes, 'A股/价值/红利')?.percentage).toBe('0.00%');
  });

  it('未填写叶子视为 0 元', () => {
    const { nodes } = calculatePositionTree(POSITION_CATEGORY_TREE, {
      totalInvestment: 100_000,
      leafAmounts: {},
    });
    expect(sumAllocatedAmount(nodes)).toBe(0);
    expect(findByPath(nodes, 'A股')?.percentage).toBe('0.00%');
  });

  it('一级分类金额之和超过总投资时返回 warning', () => {
    const { warnings } = calculatePositionTree(POSITION_CATEGORY_TREE, {
      totalInvestment: 100_000,
      leafAmounts: {
        'A股/价值/红利': 80_000,
        '海外成熟/美国/标普500': 50_000,
      },
    });
    expect(warnings).toContain('持仓合计超过总投资额');
  });

  it('未分配金额归入现金三级类目', () => {
    const { nodes } = calculatePositionTree(POSITION_CATEGORY_TREE, {
      totalInvestment: 100_000,
      leafAmounts: {
        'A股/价值/红利': 60_000,
      },
    });

    expect(getUnallocatedAmount(100_000, nodes)).toBe(40_000);

    const cash = buildCashPositionNode(40_000, 100_000);
    expect(cash?.name).toBe('现金');
    expect(cash?.amount).toBe(40_000);
    expect(cash?.percentage).toBe('40.00%');
    expect(cash?.children?.[0]?.name).toBe('现金');
    expect(cash?.children?.[0]?.children?.[0]).toMatchObject({
      name: '现金',
      path: CASH_LEAF_PATH,
      amount: 40_000,
      percentage: '40.00%',
      isLeaf: true,
    });

    const chartNodes = appendCashToChartNodes(nodes, 100_000);
    expect(chartNodes).toHaveLength(4);
    expect(chartNodes[3]?.name).toBe('现金');
    expect(findByPath(chartNodes, CASH_LEAF_PATH)).toEqual({
      amount: 40_000,
      percentage: '40.00%',
    });
  });

  it('全部未分配时仅图表追加现金分支', () => {
    const { nodes } = calculatePositionTree(POSITION_CATEGORY_TREE, {
      totalInvestment: 50_000,
      leafAmounts: {},
    });
    expect(sumAllocatedAmount(nodes)).toBe(0);
    const chartNodes = appendCashToChartNodes(nodes, 50_000);
    expect(chartNodes).toHaveLength(4);
    expect(findByPath(chartNodes, '现金')?.percentage).toBe('100.00%');
  });

  it('超配时不追加现金分支', () => {
    const { nodes } = calculatePositionTree(POSITION_CATEGORY_TREE, {
      totalInvestment: 100_000,
      leafAmounts: { 'A股/价值/红利': 120_000 },
    });
    expect(getUnallocatedAmount(100_000, nodes)).toBe(0);
    expect(appendCashToChartNodes(nodes, 100_000)).toHaveLength(3);
  });
});

describe('roundAmount', () => {
  it('保留两位小数', () => {
    expect(roundAmount(1.01)).toBe(1.01);
    expect(roundAmount(1.004)).toBe(1);
    expect(roundAmount(10.556)).toBe(10.56);
  });
});
