import type { DrawdownSummary, IndexMetricPoint } from '@/types/index-dashboard';

export function calculateDrawdown(points: IndexMetricPoint[]): DrawdownSummary | null {
  const values = points.filter(point => point.close != null && Number.isFinite(point.close) && point.close > 0)
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  if (values.length === 0) return null;
  let peak = values[0].close!;
  let peakDate = values[0].tradeDate;
  let maxDrawdown = 0;
  let maxPeakDate = peakDate;
  let troughDate = peakDate;
  for (const point of values) {
    if (point.close! > peak) {
      peak = point.close!;
      peakDate = point.tradeDate;
    }
    const drawdown = ((point.close! / peak) - 1) * 100;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
      maxPeakDate = peakDate;
      troughDate = point.tradeDate;
    }
  }
  const latestClose = values.at(-1)!.close!;
  return { currentDrawdownPct: ((latestClose / peak) - 1) * 100, maximumDrawdownPct: maxDrawdown, latestClose, latestPeak: peak, peakDate: maxPeakDate, troughDate };
}
