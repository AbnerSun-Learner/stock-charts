/**
 * 成员分布饼图：数据映射与 spider 标签文案。
 */

import type { MemberShare } from '@/types/family-finance';
import { formatCny } from '@/lib/family-finance/format';

export interface MemberPieDatum {
  type: string;
  value: number;
  ratio: number;
}

/** 将成员资产份额转为 Pie 所需字段。 */
export function toMemberPieData(shares: MemberShare[]): MemberPieDatum[] {
  return shares.map(share => ({
    type: share.memberName,
    value: share.amount,
    ratio: share.ratio,
  }));
}

/**
 * Spider 标签：成员名 + 金额 + 整数占比。
 * @example 我\n¥1,234.50（36%）
 */
export function formatMemberPieLabel(d: MemberPieDatum): string {
  const percent = `${Math.round(d.ratio * 100)}%`;
  return `${d.type}\n${formatCny(d.value)}（${percent}）`;
}
