import {
  filterChartNodesWithValue,
  isL1ChartNode,
  sunburstNodesToChartData,
} from '@/utils/sunburst-chart-data';
import { positionNodesToSunburst } from '@/utils/calculate-position-tree';
import { calculatePositionTree } from '@/utils/calculate-position-tree';
import { POSITION_CATEGORY_TREE } from '@/utils/position-category-tree';

describe('sunburst-chart-data', () => {
  it('isL1ChartNode 通过 category === name 识别一级类目', () => {
    expect(isL1ChartNode('A股', 'A股')).toBe(true);
    expect(isL1ChartNode('价值', 'A股')).toBe(false);
  });

  it('filterChartNodesWithValue 剔除零值分支', () => {
    const nodes = sunburstNodesToChartData(
      positionNodesToSunburst(
        calculatePositionTree(POSITION_CATEGORY_TREE, {
          totalInvestment: 1_000_000,
          leafAmounts: {
            'A股/价值/红利': 200_000,
            '海外成熟/美国/标普500': 10_000,
          },
        }).nodes
      )
    );
    const filtered = filterChartNodesWithValue(nodes);
    expect(filtered.map(n => n.name)).toEqual(['A股', '海外成熟']);
    expect(filtered.find(n => n.name === '海外新兴')).toBeUndefined();
  });
});
