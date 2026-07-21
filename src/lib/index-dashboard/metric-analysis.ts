import type { AnalysisWindow, IndexMetricPoint, ValuationMetricKey, ValuationStatistics } from '@/types/index-dashboard';

/** A 股收盘定稿缓冲：15:05（上海）之后才把「今天」当已收盘。 */
const ASHARE_CLOSE_FINALIZE_MINUTES = 15 * 60 + 5;

function shanghaiCalendarParts(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const lookup = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return {
    date: `${lookup.year}-${lookup.month}-${lookup.day}`,
    minutes: Number(lookup.hour) * 60 + Number(lookup.minute),
  };
}

/**
 * 盘中把「今日」收盘置空，避免把盘中价当昨日定稿收盘展示。
 * PE/PB 不受影响（源通常也要到收盘后才有当日估值）。
 */
export function maskUnfinalizedCloses(points: IndexMetricPoint[], now: Date = new Date()): IndexMetricPoint[] {
  const { date: today, minutes } = shanghaiCalendarParts(now);
  if (minutes >= ASHARE_CLOSE_FINALIZE_MINUTES) return points;
  return points.map(point => (point.tradeDate === today && point.close != null ? { ...point, close: null } : point));
}

export function filterMetricWindow(points: IndexMetricPoint[], window: AnalysisWindow): IndexMetricPoint[] {
  const sorted = [...points].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  if (window === 'all' || sorted.length === 0) return sorted;
  const latest = new Date(`${sorted.at(-1)!.tradeDate}T00:00:00Z`);
  latest.setUTCFullYear(latest.getUTCFullYear() - (window === '10y' ? 10 : 5));
  const boundary = latest.toISOString().slice(0, 10);
  return sorted.filter(point => point.tradeDate >= boundary);
}

/**
 * 线性插值分位数（与 Postgres percentile_cont 同思路）。
 * @param sortedAsc 已升序的正样本
 * @param q 分位比例，取值 [0, 1]
 */
export function quantileCont(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) throw new Error('quantileCont 需要非空样本');
  if (sortedAsc.length === 1) return sortedAsc[0];
  const clamped = Math.min(1, Math.max(0, q));
  const pos = (sortedAsc.length - 1) * clamped;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sortedAsc[Math.min(base + 1, sortedAsc.length - 1)];
  return sortedAsc[base] + rest * (next - sortedAsc[base]);
}

export function analyzeValuation(points: IndexMetricPoint[], key: ValuationMetricKey): ValuationStatistics | null {
  const values = [...points]
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
    .map(point => ({ value: point[key], tradeDate: point.tradeDate }))
    .filter((item): item is { value: number; tradeDate: string } => item.value != null && Number.isFinite(item.value) && item.value > 0);
  if (values.length === 0) return null;
  const currentItem = values.at(-1)!;
  const numeric = values.map(item => item.value);
  const ascending = [...numeric].sort((a, b) => a - b);
  const minimum = ascending[0];
  const maximum = ascending.at(-1)!;
  const binCount = Math.min(24, Math.max(1, Math.ceil(Math.sqrt(numeric.length) * 2)));
  const width = maximum === minimum ? 1 : (maximum - minimum) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => {
    const from = minimum + index * width;
    const to = index === binCount - 1 ? maximum : from + width;
    return { from, to, count: 0, containsCurrent: currentItem.value >= from && (index === binCount - 1 ? currentItem.value <= to : currentItem.value < to) };
  });
  for (const value of numeric) {
    const index = maximum === minimum ? 0 : Math.min(binCount - 1, Math.floor((value - minimum) / width));
    bins[index].count += 1;
  }
  return {
    current: currentItem.value,
    average: numeric.reduce((sum, value) => sum + value, 0) / numeric.length,
    minimum,
    maximum,
    percentile: (numeric.filter(value => value <= currentItem.value).length / numeric.length) * 100,
    valueAt20: quantileCont(ascending, 0.2),
    valueAt50: quantileCont(ascending, 0.5),
    valueAt80: quantileCont(ascending, 0.8),
    sampleSize: numeric.length,
    tradeDate: currentItem.tradeDate,
    insufficientSamples: numeric.length < 20,
    bins,
  };
}
