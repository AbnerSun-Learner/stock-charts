/** 金额相等比较容差（基础币种） */
export const MONEY_EPSILON = 1e-6;
/** 权重和比较容差 */
export const WEIGHT_EPSILON = 1e-8;
/** 内部计算保留小数位 */
export const INTERNAL_SCALE = 8;

/**
 * 四舍五入到指定小数位（内部先放大再取整，避免裸浮点相等判断）。
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** 金额展示/比较：保留 2 位 */
export function roundMoney(value: number): number {
  return roundTo(value, 2);
}

/** 份额/权重：保留 8 位 */
export function roundShares(value: number): number {
  return roundTo(value, INTERNAL_SCALE);
}

/** 权重：保留 8 位 */
export function roundWeight(value: number): number {
  return roundTo(value, INTERNAL_SCALE);
}

/** 汇率：保留 8 位 */
export function roundFxRate(value: number): number {
  return roundTo(value, INTERNAL_SCALE);
}

/** 金额是否相等（容差 1e-6） */
export function isMoneyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= MONEY_EPSILON;
}

/** 权重是否相等（容差 1e-8） */
export function isWeightEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= WEIGHT_EPSILON;
}

/** |sum - 1| ≤ 1e-8 */
export function isWeightSumOne(sum: number): boolean {
  return isWeightEqual(sum, 1);
}

/** 格式化金额（默认 2 位） */
export function formatMoney(value: number, decimals = 2): string {
  return roundTo(value, decimals).toFixed(decimals);
}

/** 格式化百分比（输入为小数权重，如 0.15 → 15.00%） */
export function formatPercent(weight: number, decimals = 2): string {
  return `${roundTo(weight * 100, decimals).toFixed(decimals)}%`;
}

/** 格式化份额（默认 8 位，去掉尾随 0） */
export function formatShares(value: number, decimals = INTERNAL_SCALE): string {
  const fixed = roundTo(value, decimals).toFixed(decimals);
  return fixed.replace(/\.?0+$/, '') || '0';
}

/**
 * 内部累加后统一裁剪到 8 位再暴露，减少中间浮点漂移。
 */
export function finalizeInternal(value: number): number {
  return roundTo(value, INTERNAL_SCALE);
}
