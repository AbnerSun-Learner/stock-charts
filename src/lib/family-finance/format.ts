/**
 * 家庭财务金额展示格式化。
 */

import { roundMoney } from './aggregates';

/** 格式化为人民币金额（两位小数）。 */
export function formatCny(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(amount));
}
