import {
  buildOverviewTooltipIndex,
  formatSignedPct,
  renderOverviewTooltipHtml,
  signedPctClass,
} from '@/lib/index-dashboard/overview-tooltip';
import type { IndexMetricPoint } from '@/types/index-dashboard';

const points: IndexMetricPoint[] = [
  { indexCode: '000300.SH', tradeDate: '2015-01-05', close: 1000, peTtm: null, pb: null },
  { indexCode: '000300.SH', tradeDate: '2016-01-05', close: 1200, peTtm: 20, pb: 2 },
  { indexCode: '000300.SH', tradeDate: '2017-01-05', close: 1500, peTtm: 25, pb: 2.2 },
  { indexCode: '000300.SH', tradeDate: '2018-01-05', close: 1100, peTtm: 18, pb: 1.8 },
  { indexCode: '000300.SH', tradeDate: '2021-01-05', close: 2000, peTtm: 22, pb: 2.1 },
];

describe('buildOverviewTooltipIndex', () => {
  test('计算累计涨跌与距前高回撤', () => {
    const { byDate } = buildOverviewTooltipIndex(points, {
      indexName: '沪深300',
      indexCode: '000300.SH',
      includePe: false,
    });
    expect(byDate.get('2015-01-05')).toMatchObject({
      indexTitle: '沪深300 (000300)',
      close: 1000,
      cumulativeReturnPct: 0,
      drawdownFromPeakPct: 0,
      pe: null,
    });
    expect(byDate.get('2017-01-05')?.cumulativeReturnPct).toBeCloseTo(50, 5);
    expect(byDate.get('2018-01-05')?.drawdownFromPeakPct).toBeCloseTo(((1100 / 1500) - 1) * 100, 5);
  });

  test('开启 PE 时计算分位、滚动均值与偏离', () => {
    const { byDate } = buildOverviewTooltipIndex(points, {
      indexName: '沪深300',
      indexCode: '000300.SH',
      includePe: true,
    });
    const row = byDate.get('2018-01-05');
    expect(row?.pe).toBe(18);
    expect(row?.peHistoricalPercentile).toBeCloseTo(25, 5); // 1/4 of [20,25,18,22]
    expect(row?.peAvg5y).not.toBeNull();
    expect(row?.peDeviation5yPct).not.toBeNull();
    expect(byDate.get('2015-01-05')?.pe).toBeNull();
  });

  test('关闭 PE 时不写入估值字段', () => {
    const { byDate } = buildOverviewTooltipIndex(points, {
      indexName: '沪深300',
      indexCode: '000300.SH',
      includePe: false,
    });
    expect(byDate.get('2017-01-05')?.pe).toBeNull();
    expect(byDate.get('2017-01-05')?.peAvg5y).toBeNull();
  });
});

describe('formatSignedPct / signedPctClass', () => {
  test('涨红跌绿语义与格式', () => {
    expect(signedPctClass(12.3)).toBe('up');
    expect(signedPctClass(-4.1)).toBe('down');
    expect(formatSignedPct(14.9)).toBe('14.90%');
    expect(formatSignedPct(-4.13)).toBe('-4.13%');
    expect(formatSignedPct(null)).toBe('—');
  });
});

describe('renderOverviewTooltipHtml', () => {
  test('含 PE 时输出分组文案', () => {
    const { byDate } = buildOverviewTooltipIndex(points, {
      indexName: '沪深300',
      indexCode: '000300.SH',
      includePe: true,
    });
    const html = renderOverviewTooltipHtml(byDate.get('2018-01-05') ?? null);
    expect(html).toContain('沪深300 (000300)');
    expect(html).toContain('收盘价');
    expect(html).toContain('市盈率');
    expect(html).toContain('市盈五年均值');
    expect(html).toContain('市盈十年均值');
  });
});
