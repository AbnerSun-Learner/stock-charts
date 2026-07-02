import {
  buildSunburstChartData,
  buildSunburstChartDataFromNodes,
  canGenerateSunburstChart,
} from '@/lib/sunburst/build-sunburst-chart-data';
import { calculatePositionTree, positionNodesToSunburst } from '@/utils/calculate-position-tree';
import { POSITION_CATEGORY_TREE } from '@/utils/position-category-tree';

describe('sunburst generate pipeline', () => {
  it('canGenerateSunburstChart：总投资为 0 时不可生成', () => {
    expect(canGenerateSunburstChart(0)).toBe(false);
    expect(canGenerateSunburstChart(-1)).toBe(false);
    expect(canGenerateSunburstChart(100)).toBe(true);
  });

  it('100万 + 部分叶子 → 生成含 A股 与 现金 的一级分支', () => {
    const chartData = buildSunburstChartData(POSITION_CATEGORY_TREE, {
      totalInvestment: 1_000_000,
      leafAmounts: {
        'A股/价值/红利': 200_000,
        '海外成熟/美国/标普500': 100_000,
      },
    });

    const names = chartData.map(node => node.name);
    expect(names).toContain('A股');
    expect(names).toContain('现金');
    expect(names).not.toContain('海外新兴');

    const aStock = chartData.find(node => node.name === 'A股');
    expect(aStock?.value).toBeGreaterThan(0);
  });

  it('positionNodesToSunburst 保留 percentage 字符串', () => {
    const { nodes } = calculatePositionTree(POSITION_CATEGORY_TREE, {
      totalInvestment: 100_000,
      leafAmounts: { 'A股/价值/红利': 50_000 },
    });
    const sunburst = positionNodesToSunburst(nodes);
    expect(sunburst[0]?.percentage).toBe('50.00%');
  });

  it('buildSunburstChartDataFromNodes 与 buildSunburstChartData 结果一致', () => {
    const input = {
      totalInvestment: 500_000,
      leafAmounts: { 'A股/行业/传媒': 100_000 },
    };
    const { nodes } = calculatePositionTree(POSITION_CATEGORY_TREE, input);
    const fromNodes = buildSunburstChartDataFromNodes(nodes, input.totalInvestment);
    const fromTree = buildSunburstChartData(POSITION_CATEGORY_TREE, input);
    expect(fromNodes.map(n => n.name)).toEqual(fromTree.map(n => n.name));
  });
});
