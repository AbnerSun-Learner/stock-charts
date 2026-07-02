import { getPriceDecimals, validateGridParams } from '@/lib/grid-validate-params';
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

describe('validateGridParams', () => {
  it('合法默认参数应通过校验', () => {
    const result = validateGridParams(DEFAULT_PARAMS);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('最低价 >= 基准价时应报错', () => {
    const result = validateGridParams({ ...DEFAULT_PARAMS, minPrice: 1.0, basePrice: 1.0 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('最低价必须小于基准价');
  });

  it('基础步长 >= 中网步长时应报错', () => {
    const result = validateGridParams({
      ...DEFAULT_PARAMS,
      smallGridStep: 20,
      mediumGridStep: 15,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('基础步长必须小于中网步长');
  });

  it('步长超过 100% 时应报错', () => {
    const result = validateGridParams({ ...DEFAULT_PARAMS, largeGridStep: 101 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('步长不能超过100%');
  });
});

describe('getPriceDecimals', () => {
  it('priceUnit=0.001 时返回 3 位小数', () => {
    expect(getPriceDecimals(0.001)).toBe(3);
  });

  it('priceUnit=1 时返回 0 位小数', () => {
    expect(getPriceDecimals(1)).toBe(0);
  });
});
