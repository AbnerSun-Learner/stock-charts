import { runGridCalculation } from '@/lib/grid-run-calculation';
import { validateGridParams } from '@/lib/grid-validate-params';
import { DEFAULT_GRID_PARAMS } from '@/types/grid';

describe('runGridCalculation', () => {
  it('校验通过时应返回网格数据', () => {
    const validation = validateGridParams(DEFAULT_GRID_PARAMS);
    const result = runGridCalculation(
      DEFAULT_GRID_PARAMS,
      { dynamicGridEnabled: false, dynamicGridMode: 'stable' },
      validation
    );
    expect(result.gridData.length).toBeGreaterThan(0);
    expect(result.stressTest).not.toBeNull();
    expect(result.legs.length).toBeGreaterThan(0);
    expect(result.aggregatedRows.length).toBeGreaterThan(0);
  });

  it('校验失败时应返回空结果', () => {
    const invalid = validateGridParams({
      ...DEFAULT_GRID_PARAMS,
      minPrice: 2,
      basePrice: 1,
    });
    const result = runGridCalculation(
      DEFAULT_GRID_PARAMS,
      { dynamicGridEnabled: false, dynamicGridMode: 'stable' },
      invalid
    );
    expect(result.gridData).toHaveLength(0);
    expect(result.stressTest).toBeNull();
    expect(result.calculationErrors).toHaveLength(0);
  });

  it('无有效档位时应返回 E13 计算后错误', () => {
    const params = {
      ...DEFAULT_GRID_PARAMS,
      budgetMode: 'manual' as const,
      amountPerGrid: 10,
    };
    const validation = validateGridParams(params);
    const result = runGridCalculation(
      params,
      { dynamicGridEnabled: false, dynamicGridMode: 'stable' },
      validation
    );

    expect(result.gridData).toHaveLength(0);
    expect(result.stressTest).toBeNull();
    expect(result.calculationErrors).toContain(
      '总弹药不足以生成任何有效档位'
    );
  });
});
