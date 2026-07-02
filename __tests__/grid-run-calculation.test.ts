import { runGridCalculation } from '@/lib/grid-run-calculation';
import { validateGridParams } from '@/lib/grid-validate-params';
import type { GridParams } from '@/types/grid';

const DEFAULT_PARAMS: GridParams = {
  minTradeUnit: 100,
  priceUnit: 0.001,
  basePrice: 1.0,
  amountPerGrid: 10000,
  minPrice: 0.5,
  smallGridStep: 5.0,
  mediumGridStep: 15.0,
  largeGridStep: 30.0,
  amountMultiplier: 1.0,
  profitReserveMultiplier: 1.0,
};

describe('runGridCalculation', () => {
  it('校验通过时应返回网格数据', () => {
    const validation = validateGridParams(DEFAULT_PARAMS);
    const result = runGridCalculation(
      DEFAULT_PARAMS,
      { dynamicGridEnabled: false, dynamicGridMode: 'stable' },
      validation
    );
    expect(result.gridData.length).toBeGreaterThan(0);
    expect(result.stressTest).not.toBeNull();
  });

  it('校验失败时应返回空结果', () => {
    const invalid = validateGridParams({ ...DEFAULT_PARAMS, minPrice: 2, basePrice: 1 });
    const result = runGridCalculation(
      DEFAULT_PARAMS,
      { dynamicGridEnabled: false, dynamicGridMode: 'stable' },
      invalid
    );
    expect(result.gridData).toHaveLength(0);
    expect(result.stressTest).toBeNull();
  });
});
