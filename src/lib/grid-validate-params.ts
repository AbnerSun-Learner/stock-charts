import type { GridParams } from '@/types/grid';

export interface GridParamsValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * 根据价格精度计算展示用小数位数。
 */
export function getPriceDecimals(priceUnit: number): number {
  if (priceUnit >= 1) return 0;
  if (priceUnit >= 0.1) return 1;
  if (priceUnit >= 0.01) return 2;
  if (priceUnit >= 0.001) return 3;
  return 4;
}

/**
 * 校验网格策略参数，规则与网格策略页一致。
 */
export function validateGridParams(params: GridParams): GridParamsValidation {
  const errors: string[] = [];

  if (params.minPrice >= params.basePrice) {
    errors.push('最低价必须小于基准价');
  }
  if (params.minPrice <= 0 || params.basePrice <= 0 || params.amountPerGrid <= 0) {
    errors.push('所有数值必须大于0');
  }
  if (params.smallGridStep <= 0 || params.mediumGridStep <= 0 || params.largeGridStep <= 0) {
    errors.push('步长必须大于0');
  }
  if (
    params.smallGridStep > 100 ||
    params.mediumGridStep > 100 ||
    params.largeGridStep > 100
  ) {
    errors.push('步长不能超过100%');
  }
  if (params.smallGridStep >= params.mediumGridStep) {
    errors.push('基础步长必须小于中网步长');
  }
  if (params.mediumGridStep >= params.largeGridStep) {
    errors.push('中网步长必须小于大网步长');
  }
  if (params.amountMultiplier < 0 || params.profitReserveMultiplier < 0) {
    errors.push('系数不能小于0');
  }

  return { isValid: errors.length === 0, errors };
}
