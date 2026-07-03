import { computeValuationPercentile } from '@/lib/indicators';

describe('valuation indicators', () => {
  it('PE 百分位：当前值越低越便宜', () => {
    const historical = Array.from({ length: 252 }, (_, i) => 10 + i * 0.05);
    const result = computeValuationPercentile(historical, 14, 'PE');
    expect(result).not.toBeNull();
    // i=0..80 对应值 <= 14，共 81 个
    expect(result!.percentile).toBeCloseTo((81 / 252) * 100, 1);
    expect(result!.confidence).toBe('low');
  });

  it('股息率百分位反向：越高越便宜', () => {
    const historical = Array.from({ length: 252 }, (_, i) => 2 + i * 0.004);
    const result = computeValuationPercentile(historical, 2.8, 'DIVIDEND_YIELD');
    expect(result).not.toBeNull();
    // i>=200 时 yield>=2.8，共 52 个
    expect(result!.percentile).toBeCloseTo((52 / 252) * 100, 1);
  });

  it('历史不足 1 年返回 none 置信', () => {
    const historical = Array.from({ length: 100 }, (_, i) => 10 + i * 0.1);
    const result = computeValuationPercentile(historical, 15, 'PE');
    expect(result!.confidence).toBe('none');
  });

  it('历史不足 252 交易日且少于 1 年样本返回 none', () => {
    const historical = [10, 11, 12];
    const result = computeValuationPercentile(historical, 11, 'PE');
    expect(result!.confidence).toBe('none');
    expect(Number.isNaN(result!.percentile)).toBe(true);
  });

  it('五年样本为高置信', () => {
    const historical = Array.from({ length: 1260 }, (_, i) => 10 + (i % 50) * 0.1);
    const result = computeValuationPercentile(historical, 12, 'PB');
    expect(result!.confidence).toBe('high');
    expect(result!.percentile).toBeGreaterThanOrEqual(0);
    expect(result!.percentile).toBeLessThanOrEqual(100);
  });
});
