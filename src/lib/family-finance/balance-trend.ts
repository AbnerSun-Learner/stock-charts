/**
 * 家庭资产负债日序列：范围裁切与折线长表映射。
 */

import type {
  BalanceTrendPoint,
  BalanceTrendRange,
  FamilyBalanceSnapshot,
} from '@/types/family-finance';
import { BALANCE_TREND_TYPES } from '@/types/family-finance';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TYPE_ORDER = new Map(
  BALANCE_TREND_TYPES.map((type, index) => [type, index] as const)
);

/** Asia/Shanghai 日历今日 YYYY-MM-DD。 */
export function shanghaiTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** 日历日加减（按 UTC 午夜解析 YYYY-MM-DD，避免本地时区偏移）。 */
export function shiftCalendarDate(isoDate: string, deltaDays: number): string {
  const utc = Date.parse(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(utc)) {
    throw new Error(`无效日期: ${isoDate}`);
  }
  return new Date(utc + deltaDays * MS_PER_DAY).toISOString().slice(0, 10);
}

function rangeCutoff(range: BalanceTrendRange, asOfDate: string): string | null {
  if (range === 'all') return null;
  if (range === '90d') return shiftCalendarDate(asOfDate, -90);
  return shiftCalendarDate(asOfDate, -365);
}

/**
 * 按范围过滤快照；始终按日期升序。
 * @param asOfDate 裁切锚点（YYYY-MM-DD），通常为上海日历「今天」
 */
export function filterBalanceSnapshots(
  points: FamilyBalanceSnapshot[],
  range: BalanceTrendRange,
  asOfDate: string
): FamilyBalanceSnapshot[] {
  const cutoff = rangeCutoff(range, asOfDate);
  const filtered = cutoff
    ? points.filter(p => p.date >= cutoff && p.date <= asOfDate)
    : points.filter(p => p.date <= asOfDate);
  return [...filtered].sort((a, b) => a.date.localeCompare(b.date));
}

/** 每个快照展开为总资产 / 总负债 / 净资产三条长表点（按类型固定序、再按日期）。 */
export function toBalanceTrendSeries(
  points: FamilyBalanceSnapshot[]
): BalanceTrendPoint[] {
  const series: BalanceTrendPoint[] = [];
  for (const point of points) {
    series.push(
      { date: point.date, type: '总资产', amount: point.totalAssets },
      { date: point.date, type: '总负债', amount: point.totalLiabilities },
      { date: point.date, type: '净资产', amount: point.netWorth }
    );
  }
  return series.sort((a, b) => {
    const typeDiff = (TYPE_ORDER.get(a.type) ?? 0) - (TYPE_ORDER.get(b.type) ?? 0);
    return typeDiff !== 0 ? typeDiff : a.date.localeCompare(b.date);
  });
}
