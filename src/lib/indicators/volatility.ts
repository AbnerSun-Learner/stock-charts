import { computeDailyReturns, takeLast } from './returns';

/** 样本标准差（除以 n-1） */
export function sampleStd(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** 年化波动率：dailyVol * sqrt(252) */
export function computeAnnualizedVolatility(
  closes: number[],
  window: number
): number | null {
  const returns = takeLast(computeDailyReturns(closes), window);
  if (returns.length < window) return null;
  const dailyVol = sampleStd(returns);
  if (dailyVol === null) return null;
  return dailyVol * Math.sqrt(252);
}

/** 单根 TR */
export function computeTrueRange(
  high: number,
  low: number,
  prevClose: number
): number {
  return Math.max(
    high - low,
    Math.abs(high - prevClose),
    Math.abs(low - prevClose)
  );
}

/** 20 日 ATR 及 ATR% */
export function computeAtr20(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 20
): { atr: number; atrPct: number } | null {
  const minLen = period + 1;
  if (
    highs.length < minLen ||
    lows.length < minLen ||
    closes.length < minLen
  ) {
    return null;
  }

  const trValues: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    trValues.push(computeTrueRange(highs[i], lows[i], closes[i - 1]));
  }

  const recentTr = takeLast(trValues, period);
  if (recentTr.length < period) return null;

  const atr = recentTr.reduce((sum, v) => sum + v, 0) / period;
  const lastClose = closes[closes.length - 1];
  if (lastClose <= 0) return null;

  return { atr, atrPct: (atr / lastClose) * 100 };
}

/** 20 日日均振幅 % */
export function computeAvgDailyRangePct20(
  highs: number[],
  lows: number[],
  closes: number[]
): number | null {
  if (highs.length < 21 || lows.length < 21 || closes.length < 21) {
    return null;
  }

  const ranges: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prevClose = closes[i - 1];
    if (prevClose <= 0) continue;
    ranges.push(((highs[i] - lows[i]) / prevClose) * 100);
  }

  const recent = takeLast(ranges, 20);
  if (recent.length < 20) return null;
  return recent.reduce((sum, v) => sum + v, 0) / 20;
}
