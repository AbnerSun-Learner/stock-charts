import type { SupabaseClient } from '@supabase/supabase-js';
import {
  mapEtfDailyRows,
  mapIndicesWithEtf,
  mapIndustryWeightRows,
  mapIndexMetricRows,
  mapValuationRow,
  type EtfDailyRow,
  type EtfPoolRow,
  type EtfValuationRow,
  type IndicesRow,
  type IndustryWeightRow,
  type IndexMetricRow,
} from '@/lib/index-dashboard/map-rows';
import type {
  EtfPriceBar,
  IndexWithEtf,
  IndustryWeight,
  IndexMetricPoint,
  ValuationSnapshot,
} from '@/types/index-dashboard';

/**
 * 共享行情只读 Repository（指数仪表盘）。
 * 禁止对本仓写入 etf_daily / index_valuation 等共享表。
 */
export class IndexMarketRepository {
  constructor(private readonly client: SupabaseClient) {}

  /** 列出池内有跟踪指数的指数 + ETF。 */
  async listIndicesWithEtf(): Promise<IndexWithEtf[]> {
    const [indicesResult, poolResult] = await Promise.all([
      this.client
        .from('indices')
        .select('code, name, category, display_order')
        .order('display_order', { ascending: true }),
      this.client
        .from('etf_pool')
        .select(
          'etf_code, etf_name, category, tracking_index_code, tracking_index_name, aum_yi, avg_daily_turnover_yi, premium_discount, expense_ratio, snapshot_date'
        ),
    ]);

    if (indicesResult.error) {
      throw new Error(`读取 indices 失败: ${indicesResult.error.message}`);
    }
    if (poolResult.error) {
      throw new Error(`读取 etf_pool 失败: ${poolResult.error.message}`);
    }

    return mapIndicesWithEtf(
      (indicesResult.data ?? []) as IndicesRow[],
      (poolResult.data ?? []) as EtfPoolRow[]
    );
  }

  /** 读取跟踪指数估值快照。 */
  async getValuation(indexCode: string): Promise<ValuationSnapshot | null> {
    const { data, error } = await this.client
      .from('index_valuation')
      .select('tracking_index_code, trade_date, current_pe_ttm, pe_ttm_avg_5y, pe_ttm_avg_10y')
      .eq('tracking_index_code', indexCode)
      .maybeSingle();

    if (error) {
      throw new Error(`读取 index_valuation 失败: ${error.message}`);
    }
    return mapValuationRow((data as EtfValuationRow | null) ?? null);
  }

  /** 读取指数历史收盘、PE_TTM 与 PB（升序）。 */
  async getIndexMetrics(indexCode: string): Promise<IndexMetricPoint[]> {
    const pageSize = 1000;
    const rows: IndexMetricRow[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await this.client
        .from('index_daily_metrics')
        .select('index_code, trade_date, close, pe_ttm, pb')
        .eq('index_code', indexCode)
        .order('trade_date', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(`读取 index_daily_metrics 失败: ${error.message}`);
      const page = (data ?? []) as IndexMetricRow[];
      rows.push(...page);
      if (page.length < pageSize) break;
    }
    return mapIndexMetricRows(rows);
  }

  /** 读取跟踪 ETF 最新收盘价，优先前复权。 */
  async getLatestEtfClose(etfCode: string): Promise<number | null> {
    const { data, error } = await this.client
      .from('etf_daily')
      .select('etf_code, trade_date, open, high, low, close, volume, open_qfq, high_qfq, low_qfq, close_qfq')
      .eq('etf_code', etfCode)
      .order('trade_date', { ascending: false })
      .limit(1);
    if (error) throw new Error(`读取 etf_daily 最新价失败: ${error.message}`);
    return mapEtfDailyRows((data ?? []) as EtfDailyRow[])[0]?.close ?? null;
  }

  /** 读取指数行业权重（全部 sw 级别）。 */
  async getIndustryWeights(indexCode: string): Promise<IndustryWeight[]> {
    const { data, error } = await this.client
      .from('index_industry_weights')
      .select('index_code, as_of_date, sw_level, industry_name, weight_pct')
      .eq('index_code', indexCode)
      .order('weight_pct', { ascending: false });

    if (error) {
      throw new Error(`读取 index_industry_weights 失败: ${error.message}`);
    }
    return mapIndustryWeightRows((data ?? []) as IndustryWeightRow[]);
  }

  /**
   * 读取 ETF 日 K（升序）。
   * @param fromDate 起始交易日（含），YYYY-MM-DD
   */
  async getEtfDaily(etfCode: string, fromDate: string): Promise<EtfPriceBar[]> {
    const { data, error } = await this.client
      .from('etf_daily')
      .select(
        'etf_code, trade_date, open, high, low, close, volume, open_qfq, high_qfq, low_qfq, close_qfq'
      )
      .eq('etf_code', etfCode)
      .gte('trade_date', fromDate)
      .order('trade_date', { ascending: true });

    if (error) {
      throw new Error(`读取 etf_daily 失败: ${error.message}`);
    }
    return mapEtfDailyRows((data ?? []) as EtfDailyRow[]);
  }
}

/**
 * 计算往前 N 个自然日的日期字符串（用于日 K 窗口近似）。
 */
export function daysAgoIsoDate(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
