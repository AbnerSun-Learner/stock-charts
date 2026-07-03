import {
  getPriceDecimals,
  validateGeneratedLegs,
  validateGridParams,
} from '@/lib/grid-validate-params';
import { DEFAULT_GRID_PARAMS } from '@/types/grid';

describe('validateGridParams', () => {
  it('合法默认参数应通过校验', () => {
    const result = validateGridParams(DEFAULT_GRID_PARAMS);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('最低价 >= 基准价时应报错', () => {
    const result = validateGridParams({
      ...DEFAULT_GRID_PARAMS,
      minPrice: 1.0,
      basePrice: 1.0,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('最低价必须小于基准价');
  });

  it('小网步长 >= 中网步长时应报错', () => {
    const result = validateGridParams({
      ...DEFAULT_GRID_PARAMS,
      smallGridStep: 20,
      mediumGridStep: 15,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('小网步长必须小于中网步长');
  });

  it('大网步长 >= 100% 时应报错', () => {
    const result = validateGridParams({
      ...DEFAULT_GRID_PARAMS,
      largeGridStep: 100,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('大网步长必须小于 100%');
  });

  it('总弹药 <= 0 时应报错', () => {
    const result = validateGridParams({
      ...DEFAULT_GRID_PARAMS,
      totalBudget: 0,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('总弹药必须大于 0');
  });
});

describe('validateGeneratedLegs', () => {
  it('存在有效档位时应通过', () => {
    const result = validateGeneratedLegs(3);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('无有效档位时应返回 E13', () => {
    const result = validateGeneratedLegs(0);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('总弹药不足以生成任何有效档位');
  });
});

describe('getPriceDecimals', () => {
  it('priceUnit=0.001 时返回 3 位小数', () => {
    expect(getPriceDecimals(0.001)).toBe(3);
  });
});
