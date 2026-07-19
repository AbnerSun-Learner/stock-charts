import type { AnalysisWindow, IndexMetricPoint, ValuationMetricKey, ValuationStatistics } from '@/types/index-dashboard';

export function filterMetricWindow(points: IndexMetricPoint[], window: AnalysisWindow): IndexMetricPoint[] {
  const sorted = [...points].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  if (window === 'all' || sorted.length === 0) return sorted;
  const latest = new Date(`${sorted.at(-1)!.tradeDate}T00:00:00Z`);
  latest.setUTCFullYear(latest.getUTCFullYear() - (window === '10y' ? 10 : 5));
  const boundary = latest.toISOString().slice(0, 10);
  return sorted.filter(point => point.tradeDate >= boundary);
}

export function analyzeValuation(points: IndexMetricPoint[], key: ValuationMetricKey): ValuationStatistics | null {
  const values = [...points]
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
    .map(point => ({ value: point[key], tradeDate: point.tradeDate }))
    .filter((item): item is { value: number; tradeDate: string } => item.value != null && Number.isFinite(item.value) && item.value > 0);
  if (values.length === 0) return null;
  const currentItem = values.at(-1)!;
  const numeric = values.map(item => item.value);
  const minimum = Math.min(...numeric);
  const maximum = Math.max(...numeric);
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
    sampleSize: numeric.length,
    tradeDate: currentItem.tradeDate,
    insufficientSamples: numeric.length < 20,
    bins,
  };
}
