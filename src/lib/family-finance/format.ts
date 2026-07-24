/**
 * 家庭财务金额展示格式化。
 */

import { roundMoney } from './aggregates';

/** 金额隐藏时的固定遮罩文案。 */
export const MASKED_AMOUNT = '****';

export type FormatCnyOptions = {
  /** 为 false 时返回 MASKED_AMOUNT；缺省视为显示 */
  visible?: boolean;
};

/** 格式化为人民币金额（两位小数）。负数为「- ¥…」，负号与金额留空。 */
export function formatCny(amount: number, options?: FormatCnyOptions): string {
  if (options?.visible === false) return MASKED_AMOUNT;

  const formatted = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(amount));

  // zh-CN 默认「-¥…」；兼容 ASCII / Unicode 减号，负号与金额符号留空
  return formatted.replace(/^[-−]¥/, '- ¥');
}

/** 紧凑金额（图表 Y 轴等）。隐藏时同样返回 MASKED_AMOUNT。 */
export function formatCompactCny(
  amount: number,
  options?: FormatCnyOptions
): string {
  if (options?.visible === false) return MASKED_AMOUNT;

  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}
