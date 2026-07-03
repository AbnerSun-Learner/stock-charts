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
 * 校验网格策略参数（Phase 1 规则）。
 */
export function validateGridParams(params: GridParams): GridParamsValidation {
  const errors: string[] = [];

  if (params.basePrice <= 0) {
    errors.push('基准价必须大于 0');
  }
  if (params.minPrice <= 0) {
    errors.push('最低价必须大于 0');
  }
  if (params.minPrice >= params.basePrice) {
    errors.push('最低价必须小于基准价');
  }
  if (params.totalBudget <= 0) {
    errors.push('总弹药必须大于 0');
  }
  if (
    params.smallGridStep <= 0 ||
    params.mediumGridStep <= 0 ||
    params.largeGridStep <= 0
  ) {
    errors.push('步长必须大于 0');
  }
  if (params.smallGridStep >= params.mediumGridStep) {
    errors.push('小网步长必须小于中网步长');
  }
  if (params.mediumGridStep >= params.largeGridStep) {
    errors.push('中网步长必须小于大网步长');
  }
  if (params.largeGridStep >= 100) {
    errors.push('大网步长必须小于 100%');
  }
  if (params.amountMultiplier < 0) {
    errors.push('金额加码系数不能小于 0');
  }
  if (params.profitReserveMultiplier < 0) {
    errors.push('留利系数不能小于 0');
  }
  if (params.priceUnit <= 0) {
    errors.push('价格精度必须大于 0');
  }
  if (params.minTradeUnit < 1) {
    errors.push('最小交易单位必须大于等于 1');
  }
  if (params.budgetMode === 'manual' && params.amountPerGrid <= 0) {
    errors.push('手动模式下每份金额必须大于 0');
  }
  if (
    (params.largeGridStep / 100) * params.profitReserveMultiplier > 1
  ) {
    errors.push('利润留存系数过大：大网步长 × 留存系数 不能超过 100%');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * 校验反推后是否存在有效档位（需在计算后调用）。
 */
export function validateGeneratedLegs(legCount: number): GridParamsValidation {
  if (legCount > 0) {
    return { isValid: true, errors: [] };
  }
  return {
    isValid: false,
    errors: ['总弹药不足以生成任何有效档位'],
  };
}
