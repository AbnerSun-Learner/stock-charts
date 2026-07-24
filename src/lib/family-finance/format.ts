/**
 * 家庭财务金额展示格式化。
 */

import { roundMoney } from './aggregates';

/** 格式化为人民币金额（两位小数）。负数为「- ¥…」，负号与金额留空。 */
export function formatCny(amount: number): string {
  const formatted = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(amount));

  // zh-CN 默认「-¥…」；兼容 ASCII / Unicode 减号，负号与金额符号留空
  return formatted.replace(/^[-−]¥/, '- ¥');
}
