import {
  computeAtr20,
  computeTrueRange,
  computeAnnualizedVolatility,
  computeAvgDailyRangePct20,
} from '@/lib/indicators';

describe('volatility indicators', () => {
  const highs = [
    10, 10.5, 10.2, 10.8, 10.1, 10.6, 10.3, 10.7, 10.4, 10.9,
    10.2, 10.5, 10.8, 10.1, 10.6, 10.3, 10.7, 10.4, 10.9, 10.2,
    10.5,
  ];
  const lows = highs.map(h => h - 1);
  const closes = highs.map(h => h - 0.3);

  it('computeTrueRange 取三者最大', () => {
    expect(computeTrueRange(12, 8, 10)).toBe(4);
    expect(computeTrueRange(11, 9, 8)).toBe(3);
  });

  it('computeAtr20 在样本足够时返回 ATR%', () => {
    const result = computeAtr20(highs, lows, closes, 20);
    expect(result).not.toBeNull();
    expect(result!.atr).toBeGreaterThan(0);
    expect(result!.atrPct).toBeGreaterThan(0);
    expect(result!.atrPct).toBeLessThan(20);
  });

  it('computeAtr20 样本不足返回 null', () => {
    expect(computeAtr20([1, 2], [1, 2], [1, 2])).toBeNull();
  });

  it('computeAnnualizedVolatility 90 日窗口', () => {
    const longCloses = Array.from({ length: 100 }, (_, i) => 10 + Math.sin(i / 5));
    const vol = computeAnnualizedVolatility(longCloses, 90);
    expect(vol).not.toBeNull();
    expect(vol!).toBeGreaterThan(0);
  });

  it('computeAvgDailyRangePct20 返回正数', () => {
    const avg = computeAvgDailyRangePct20(highs, lows, closes);
    expect(avg).not.toBeNull();
    expect(avg!).toBeGreaterThan(0);
  });
});
