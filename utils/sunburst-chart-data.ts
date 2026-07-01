import type { SunburstNode } from '@/lib/sunburst/parse-config-json';

export interface ChartNode {
  name: string;
  value: number;
  depth: number;
  category?: string;
  shares?: number;
  percentage?: string;
  children?: ChartNode[];
}

function parsePct(p: string | number | undefined): number {
  if (typeof p === 'number') return p;
  if (typeof p === 'string') return parseFloat(p.replace('%', '')) || 0;
  return 0;
}

/** 将 SunburstNode 转为图表库数据结构，并保留深度用于标签策略。 */
export function toChartData(
  node: SunburstNode,
  l1Category?: string,
  depth = 1
): ChartNode {
  const pctValue = parsePct(node.percentage);
  const value = pctValue || node.shares || 0;
  const category = l1Category ?? node.name;
  const out: ChartNode = {
    name: node.name,
    value,
    depth,
    category,
    shares: node.shares,
    percentage: node.percentage ?? (pctValue ? `${pctValue.toFixed(2)}%` : undefined),
  };
  if (node.children?.length) {
    out.children = node.children.map(c => toChartData(c, category, depth + 1));
  }
  return out;
}

export function sunburstNodesToChartData(nodes: SunburstNode[]): ChartNode[] {
  return nodes.map(n => toChartData(n));
}

/** 一级类目：category 与 name 相同（见 toChartData）。 */
export function isL1ChartNode(name: string, category?: string): boolean {
  return !!name && category === name;
}

/** 递归剔除零值分支，避免空环占用层级且干扰标签布局。 */
export function filterChartNodesWithValue(nodes: ChartNode[]): ChartNode[] {
  const result: ChartNode[] = [];

  for (const node of nodes) {
    if (node.children?.length) {
      const children = filterChartNodesWithValue(node.children);
      if (children.length === 0) continue;
      result.push({ ...node, children });
      continue;
    }
    if (node.value > 0) {
      result.push(node);
    }
  }

  return result;
}
