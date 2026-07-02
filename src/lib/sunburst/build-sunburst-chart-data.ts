import {
  appendCashToChartNodes,
  calculatePositionTree,
  positionNodesToSunburst,
  type PositionInput,
  type PositionNodeResult,
} from '@/utils/calculate-position-tree';
import type { CategoryNode } from '@/utils/position-category-tree';
import {
  filterChartNodesWithValue,
  sunburstNodesToChartData,
  type ChartNode,
} from '@/utils/sunburst-chart-data';

/**
 * 是否满足生成旭日图的前置条件（总投资额 > 0）。
 */
export function canGenerateSunburstChart(totalInvestment: number): boolean {
  return totalInvestment > 0;
}

/**
 * 由已计算的持仓树生成图表数据，与页面「生成图表」逻辑一致。
 */
export function buildSunburstChartDataFromNodes(
  calculatedNodes: PositionNodeResult[],
  totalInvestment: number
): ChartNode[] {
  const chartNodes = appendCashToChartNodes(calculatedNodes, totalInvestment);
  const sunburstNodes = positionNodesToSunburst(chartNodes);
  return filterChartNodesWithValue(sunburstNodesToChartData(sunburstNodes));
}

/**
 * 从分类树与用户输入一次性生成图表数据（供测试与页面共用）。
 */
export function buildSunburstChartData(
  categoryTree: CategoryNode[],
  input: PositionInput
): ChartNode[] {
  const { nodes } = calculatePositionTree(categoryTree, input);
  return buildSunburstChartDataFromNodes(nodes, input.totalInvestment);
}
