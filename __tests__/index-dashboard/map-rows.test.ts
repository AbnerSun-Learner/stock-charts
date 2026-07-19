import {
  mapEtfDailyRows,
  mapIndicesWithEtf,
  mapIndustryWeightRows,
  mapIndexMetricRows,
  mapValuationRow,
} from '@/lib/index-dashboard/map-rows';

describe('mapIndicesWithEtf', () => {
  it('按 display_order 排序并跳过无跟踪指数行', () => {
    const result = mapIndicesWithEtf(
      [
        { code: '000905.SH', name: '中证500', category: '宽基', display_order: 50 },
        { code: '000300.SH', name: '沪深300', category: '宽基', display_order: 20 },
      ],
      [
        {
          etf_code: '510500',
          etf_name: '中证500ETF',
          category: '宽基',
          tracking_index_code: '000905.SH',
          tracking_index_name: '中证500',
          aum_yi: 100,
          avg_daily_turnover_yi: 1,
          premium_discount: 0,
          expense_ratio: 0.5,
          snapshot_date: '2026-07-01',
        },
        {
          etf_code: '510300',
          etf_name: '沪深300ETF',
          category: '宽基',
          tracking_index_code: '000300.SH',
          tracking_index_name: '沪深300',
          aum_yi: 200,
          avg_daily_turnover_yi: 2,
          premium_discount: 0.1,
          expense_ratio: 0.6,
          snapshot_date: '2026-07-01',
        },
        {
          etf_code: '999999',
          etf_name: '无指数',
          category: '其他',
          tracking_index_code: null,
          tracking_index_name: null,
          aum_yi: null,
          avg_daily_turnover_yi: null,
          premium_discount: null,
          expense_ratio: null,
          snapshot_date: '2026-07-01',
        },
      ]
    );

    expect(result.map(r => r.indexCode)).toEqual(['000300.SH', '000905.SH']);
    expect(result[0].etfCode).toBe('510300');
  });

  it('同一指数多 ETF 时取 aum 更大者', () => {
    const result = mapIndicesWithEtf(
      [{ code: '000300.SH', name: '沪深300', category: '宽基', display_order: 1 }],
      [
        {
          etf_code: 'small',
          etf_name: '小',
          category: '宽基',
          tracking_index_code: '000300.SH',
          tracking_index_name: '沪深300',
          aum_yi: 10,
          avg_daily_turnover_yi: null,
          premium_discount: null,
          expense_ratio: null,
          snapshot_date: '2026-07-01',
        },
        {
          etf_code: 'big',
          etf_name: '大',
          category: '宽基',
          tracking_index_code: '000300.SH',
          tracking_index_name: '沪深300',
          aum_yi: 99,
          avg_daily_turnover_yi: null,
          premium_discount: null,
          expense_ratio: null,
          snapshot_date: '2026-07-01',
        },
      ]
    );
    expect(result).toHaveLength(1);
    expect(result[0].etfCode).toBe('big');
  });
});

describe('mapIndexMetricRows', () => {
  it('映射历史收盘、PE 和 PB，并过滤全空行', () => {
    const mapped = mapIndexMetricRows([
      { index_code: '000300.SH', trade_date: '2026-07-17', close: '4012.3', pe_ttm: '13.8', pb: '1.32' },
      { index_code: '000300.SH', trade_date: '2026-07-18', close: null, pe_ttm: null, pb: null },
    ]);
    expect(mapped).toEqual([{ indexCode: '000300.SH', tradeDate: '2026-07-17', close: 4012.3, peTtm: 13.8, pb: 1.32 }]);
  });
});

describe('mapValuationRow', () => {
  it('映射数值字段', () => {
    const mapped = mapValuationRow({
      tracking_index_code: '000300.SH',
      trade_date: '2026-07-17',
      current_pe_ttm: '13.98',
      pe_ttm_avg_5y: '12.55',
      pe_ttm_avg_10y: null,
    });
    expect(mapped?.currentPeTtm).toBeCloseTo(13.98);
    expect(mapped?.peTtmAvg10y).toBeNull();
  });
});

describe('mapIndustryWeightRows', () => {
  it('过滤非法 sw_level', () => {
    const mapped = mapIndustryWeightRows([
      {
        index_code: '000300.SH',
        as_of_date: '2026-05-06',
        sw_level: 'sw1',
        industry_name: '银行',
        weight_pct: '10.5',
      },
      {
        index_code: '000300.SH',
        as_of_date: '2026-05-06',
        sw_level: 'sw9',
        industry_name: '坏',
        weight_pct: 1,
      },
    ]);
    expect(mapped).toHaveLength(1);
    expect(mapped[0].weightPct).toBe(10.5);
  });
});

describe('mapEtfDailyRows', () => {
  it('优先使用前复权', () => {
    const bars = mapEtfDailyRows([
      {
        etf_code: '510300',
        trade_date: '2026-07-01',
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: 100,
        open_qfq: 10,
        high_qfq: 12,
        low_qfq: 9,
        close_qfq: 11,
      },
    ]);
    expect(bars[0].close).toBe(11);
    expect(bars[0].adjusted).toBe(true);
  });

  it('缺 qfq 时回退不复权', () => {
    const bars = mapEtfDailyRows([
      {
        etf_code: '510300',
        trade_date: '2026-07-01',
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: null,
        open_qfq: null,
        high_qfq: null,
        low_qfq: null,
        close_qfq: null,
      },
    ]);
    expect(bars[0].close).toBe(1.5);
    expect(bars[0].adjusted).toBe(false);
  });
});
