import { analyzeValuation, filterMetricWindow, maskUnfinalizedCloses, quantileCont } from '@/lib/index-dashboard/metric-analysis';
import { calculateDrawdown } from '@/lib/index-dashboard/drawdown';
import type { IndexMetricPoint } from '@/types/index-dashboard';

const point = (tradeDate: string, close: number, peTtm: number | null = null): IndexMetricPoint => ({
  indexCode: '000300.SH', tradeDate, close, peTtm, pb: peTtm == null ? null : peTtm / 5,
});

describe('filterMetricWindow', () => {
  const rows = [point('2015-07-18', 1), point('2016-07-18', 2), point('2021-07-18', 3), point('2026-07-18', 4)];

  it('以最新数据日期为锚点且包含边界', () => {
    expect(filterMetricWindow(rows, '10y').map(row => row.tradeDate)).toEqual([
      '2016-07-18', '2021-07-18', '2026-07-18',
    ]);
    expect(filterMetricWindow(rows, '5y')).toHaveLength(2);
  });

  it('上市以来返回全部并按日期升序', () => {
    expect(filterMetricWindow([...rows].reverse(), 'all').map(row => row.close)).toEqual([1, 2, 3, 4]);
  });
});

describe('analyzeValuation', () => {
  it('计算当前值、均值、区间、历史分位与 20/50/80 阈值', () => {
    const rows = Array.from({ length: 25 }, (_, index) => point(`2026-01-${String(index + 1).padStart(2, '0')}`, 100, index + 1));
    const result = analyzeValuation(rows, 'peTtm');
    expect(result?.current).toBe(25);
    expect(result?.average).toBe(13);
    expect(result?.percentile).toBe(100);
    expect(result?.minimum).toBe(1);
    expect(result?.maximum).toBe(25);
    expect(result?.valueAt20).toBeCloseTo(5.8);
    expect(result?.valueAt50).toBe(13);
    expect(result?.valueAt80).toBeCloseTo(20.2);
    expect(result?.bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(25);
    expect(result?.insufficientSamples).toBe(false);
  });

  it('忽略空值和非正值并标注小样本', () => {
    const rows = [point('2026-01-01', 100, -1), point('2026-01-02', 101, null), point('2026-01-03', 102, 10)];
    expect(analyzeValuation(rows, 'peTtm')?.sampleSize).toBe(1);
    expect(analyzeValuation(rows, 'peTtm')?.insufficientSamples).toBe(true);
  });
});

describe('maskUnfinalizedCloses', () => {
  it('盘中抹掉今日收盘，保留更早交易日', () => {
    const rows = [
      point('2026-07-20', 4598),
      point('2026-07-21', 4679),
    ];
    const masked = maskUnfinalizedCloses(rows, new Date('2026-07-21T03:30:00Z')); // 上海 11:30
    expect(masked[0].close).toBe(4598);
    expect(masked[1].close).toBeNull();
  });

  it('收盘后保留今日收盘', () => {
    const rows = [point('2026-07-21', 4679)];
    const masked = maskUnfinalizedCloses(rows, new Date('2026-07-21T07:10:00Z')); // 上海 15:10
    expect(masked[0].close).toBe(4679);
  });
});

describe('quantileCont', () => {
  it('对单点与线性插值给出稳定结果', () => {
    expect(quantileCont([10], 0.5)).toBe(10);
    expect(quantileCont([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(quantileCont([1, 2, 3, 4, 5], 0.25)).toBe(2);
  });
});

describe('calculateDrawdown', () => {
  it('给出当前回撤和窗口内最大回撤', () => {
    const result = calculateDrawdown([
      point('2026-01-01', 100), point('2026-01-02', 120), point('2026-01-03', 60), point('2026-01-04', 90),
    ]);
    expect(result?.maximumDrawdownPct).toBeCloseTo(-50);
    expect(result?.currentDrawdownPct).toBeCloseTo(-25);
    expect(result?.peakDate).toBe('2026-01-02');
    expect(result?.troughDate).toBe('2026-01-03');
  });
});
