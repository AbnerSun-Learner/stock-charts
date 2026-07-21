import {
  buildOverviewChartSeries,
  formatIndexPointsInK,
  hasPeSeries,
} from '@/lib/index-dashboard/overview-chart';
import type { IndexMetricPoint } from '@/types/index-dashboard';

const points: IndexMetricPoint[] = [
  { indexCode: '000300.SH', tradeDate: '2015-01-05', close: 3500, peTtm: null, pb: null },
  { indexCode: '000300.SH', tradeDate: '2017-02-10', close: 3413.48, peTtm: 30.14, pb: 2.1 },
  { indexCode: '000300.SH', tradeDate: '2017-02-11', close: null, peTtm: 29.5, pb: 2.0 },
  { indexCode: '000300.SH', tradeDate: '2017-02-12', close: 3450, peTtm: 29.8, pb: 2.05 },
];

describe('formatIndexPointsInK', () => {
  test('把点位格式化为 K 单位', () => {
    expect(formatIndexPointsInK(0)).toBe('0K');
    expect(formatIndexPointsInK(1765.89)).toBe('1.8K');
    expect(formatIndexPointsInK(3413.48)).toBe('3.4K');
    expect(formatIndexPointsInK(6000)).toBe('6K');
  });
});

describe('hasPeSeries', () => {
  test('存在有效 peTtm 时为 true', () => {
    expect(hasPeSeries(points)).toBe(true);
  });

  test('全部无 peTtm 时为 false', () => {
    expect(hasPeSeries(points.map(point => ({ ...point, peTtm: null })))).toBe(false);
  });
});

describe('buildOverviewChartSeries', () => {
  test('默认关闭市盈率时只写入收盘字段', () => {
    const series = buildOverviewChartSeries(points, false);
    expect(series.hasPe).toBe(false);
    expect(series.rows).toEqual([
      { date: '2015-01-05', close: 3500 },
      { date: '2017-02-10', close: 3413.48 },
      { date: '2017-02-12', close: 3450 },
    ]);
    expect(series.latestClose).toEqual({ date: '2017-02-12', close: 3450 });
  });

  test('开启市盈率时按日期写入 pe，跳过空 pe', () => {
    const series = buildOverviewChartSeries(points, true);
    expect(series.hasPe).toBe(true);
    expect(series.rows).toEqual([
      { date: '2015-01-05', close: 3500 },
      { date: '2017-02-10', close: 3413.48, pe: 30.14 },
      { date: '2017-02-11', pe: 29.5 },
      { date: '2017-02-12', close: 3450, pe: 29.8 },
    ]);
  });
});
