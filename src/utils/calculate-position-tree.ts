import {
  CASH_CATEGORY_NAME,
  CASH_LEAF_PATH,
  type CategoryNode,
} from '@/utils/position-category-tree';
import type { SunburstNode } from '@/types/sunburst';

/** 用户输入：总投资额与各叶子持仓金额 */
export interface PositionInput {
  totalInvestment: number;
  leafAmounts: Record<string, number>;
}

/** 计算后的节点（含金额与占比） */
export interface PositionNodeResult {
  name: string;
  path: string;
  amount: number;
  percentage: string;
  isLeaf: boolean;
  children?: PositionNodeResult[];
}

/** 金额归一：保留两位小数，避免浮点误差 */
export function roundAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** 格式化为元字符串（千分位 + 两位小数） */
export function formatYuan(amount: number): string {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercentage(amount: number, total: number): string {
  if (total <= 0) return '0.00%';
  return `${((amount / total) * 100).toFixed(2)}%`;
}

function buildNode(
  node: CategoryNode,
  parentPath: string,
  leafAmounts: Record<string, number>,
  totalInvestment: number
): PositionNodeResult {
  const path = parentPath ? `${parentPath}/${node.name}` : node.name;
  const isLeaf = !node.children?.length;

  if (isLeaf) {
    const amount = roundAmount(leafAmounts[path] ?? 0);
    return {
      name: node.name,
      path,
      amount,
      percentage: formatPercentage(amount, totalInvestment),
      isLeaf: true,
    };
  }

  const children = node.children!.map(child =>
    buildNode(child, path, leafAmounts, totalInvestment)
  );
  const amount = roundAmount(children.reduce((sum, c) => sum + c.amount, 0));

  return {
    name: node.name,
    path,
    amount,
    percentage: formatPercentage(amount, totalInvestment),
    isLeaf: false,
    children,
  };
}

/**
 * 根据分类树与用户输入金额，自下而上汇总并计算各节点占比。
 */
export function calculatePositionTree(
  categoryTree: CategoryNode[],
  input: PositionInput
): { nodes: PositionNodeResult[]; warnings: string[] } {
  const totalInvestment = roundAmount(input.totalInvestment);
  const nodes = categoryTree.map(node =>
    buildNode(node, '', input.leafAmounts, totalInvestment)
  );

  const warnings: string[] = [];
  const allocated = roundAmount(nodes.reduce((sum, n) => sum + n.amount, 0));
  if (totalInvestment > 0 && allocated > totalInvestment) {
    warnings.push('持仓合计超过总投资额');
  }

  return { nodes, warnings };
}

/** 将计算结果转为路径 → 节点映射，供表单展示 */
export function buildPositionPathMap(nodes: PositionNodeResult[]): Map<string, PositionNodeResult> {
  const map = new Map<string, PositionNodeResult>();
  const walk = (node: PositionNodeResult) => {
    map.set(node.path, node);
    node.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return map;
}

/** 转为旭日图 SunburstNode 结构 */
export function positionNodesToSunburst(nodes: PositionNodeResult[]): SunburstNode[] {
  return nodes.map(node => ({
    name: node.name,
    percentage: node.percentage,
    children: node.children?.length
      ? positionNodesToSunburst(node.children)
      : undefined,
  }));
}

/** 已分配金额（一级分类之和，不含自动归入的现金） */
export function sumAllocatedAmount(nodes: PositionNodeResult[]): number {
  return roundAmount(
    nodes
      .filter(node => node.name !== CASH_CATEGORY_NAME)
      .reduce((sum, n) => sum + n.amount, 0)
  );
}

/** 未分配金额 = 总投资 − 已填持仓合计（不为负） */
export function getUnallocatedAmount(
  totalInvestment: number,
  nodes: PositionNodeResult[]
): number {
  return roundAmount(Math.max(0, roundAmount(totalInvestment) - sumAllocatedAmount(nodes)));
}

/** 构建现金三级节点（一级/二级/三级均为「现金」） */
export function buildCashPositionNode(
  unallocated: number,
  totalInvestment: number
): PositionNodeResult | null {
  const amount = roundAmount(unallocated);
  if (amount <= 0 || totalInvestment <= 0) return null;

  const percentage = formatPercentage(amount, totalInvestment);
  const leaf: PositionNodeResult = {
    name: CASH_CATEGORY_NAME,
    path: CASH_LEAF_PATH,
    amount,
    percentage,
    isLeaf: true,
  };
  const l2: PositionNodeResult = {
    name: CASH_CATEGORY_NAME,
    path: `${CASH_CATEGORY_NAME}/${CASH_CATEGORY_NAME}`,
    amount,
    percentage,
    isLeaf: false,
    children: [leaf],
  };

  return {
    name: CASH_CATEGORY_NAME,
    path: CASH_CATEGORY_NAME,
    amount,
    percentage,
    isLeaf: false,
    children: [l2],
  };
}

/** 图表用节点：在持仓树后追加未分配现金分支 */
export function appendCashToChartNodes(
  nodes: PositionNodeResult[],
  totalInvestment: number
): PositionNodeResult[] {
  const cash = buildCashPositionNode(
    getUnallocatedAmount(totalInvestment, nodes),
    totalInvestment
  );
  return cash ? [...nodes, cash] : nodes;
}
