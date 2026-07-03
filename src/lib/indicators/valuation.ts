import type { ValuationMetric } from '@/types/market';

export type ValuationConfidence = 'high' | 'low' | 'none';

export interface ValuationPercentileResult {
  metric: ValuationMetric;
  currentValue: number;
  percentile: number;
  historyYears: number;
  confidence: ValuationConfidence;
  sampleSize: number;
}

/** 由交易日数量估算历史年数（约 252 日/年） */
export function estimateHistoryYears(tradingDays: number): number {
  return tradingDays / 252;
}

/** 计算便宜程度百分位：越低越便宜 */
export function computeValuationPercentile(
  historicalValues: number[],
  currentValue: number,
  metric: ValuationMetric
): ValuationPercentileResult | null {
  const valid = historicalValues.filter(v => Number.isFinite(v));
  if (valid.length === 0 || !Number.isFinite(currentValue)) return null;

  const historyYears = estimateHistoryYears(valid.length);
  if (historyYears < 1) {
    return {
      metric,
      currentValue,
      percentile: Number.NaN,
      historyYears,
      confidence: 'none',
      sampleSize: valid.length,
    };
  }

  const count =
    metric === 'DIVIDEND_YIELD'
      ? valid.filter(v => v >= currentValue).length
      : valid.filter(v => v <= currentValue).length;

  const percentile = (count / valid.length) * 100;
  const confidence: ValuationConfidence =
    historyYears >= 3 ? 'high' : historyYears >= 1 ? 'low' : 'none';

  return {
    metric,
    currentValue,
    percentile,
    historyYears,
    confidence,
    sampleSize: valid.length,
  };
}

/** 从 PE/PB/股息率序列提取当前值与历史序列 */
export function extractValuationSeries(
  values: number[],
  metric: ValuationMetric
): { historical: number[]; current: number } | null {
  const valid = values.filter(v => Number.isFinite(v));
  if (valid.length === 0) return null;
  return {
    historical: valid.slice(0, -1),
    current: valid[valid.length - 1],
  };
}
