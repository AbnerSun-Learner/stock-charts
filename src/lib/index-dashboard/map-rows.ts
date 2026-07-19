import type {
  EtfPriceBar,
  IndexWithEtf,
  IndustryWeight,
  IndexMetricPoint,
  SwLevel,
  ValuationSnapshot,
} from '@/types/index-dashboard';

/** `indices` 物理行。 */
export interface IndicesRow {
  code: string;
  name: string;
  category: string;
  display_order: number;
}

/** `etf_pool` 物理行。 */
export interface EtfPoolRow {
  etf_code: string;
  etf_name: string;
  category: string;
  tracking_index_code: string | null;
  tracking_index_name: string | null;
  aum_yi: number | string | null;
  avg_daily_turnover_yi: number | string | null;
  premium_discount: number | string | null;
  expense_ratio: number | string | null;
  snapshot_date: string;
}

/** `index_valuation` 物理行。 */
export interface EtfValuationRow {
  tracking_index_code: string;
  trade_date: string;
  current_pe_ttm: number | string | null;
  pe_ttm_avg_5y: number | string | null;
  pe_ttm_avg_10y: number | string | null;
}

/** `index_daily_metrics` 物理行。 */
export interface IndexMetricRow {
  index_code: string;
  trade_date: string;
  close: number | string | null;
  pe_ttm: number | string | null;
  pb: number | string | null;
}

/** `index_industry_weights` 物理行。 */
export interface IndustryWeightRow {
  index_code: string;
  as_of_date: string;
  sw_level: string;
  industry_name: string;
  weight_pct: number | string;
}

/** `etf_daily` 物理行。 */
export interface EtfDailyRow {
  etf_code: string;
  trade_date: string;
  open: number | string | null;
  high: number | string | null;
  low: number | string | null;
  close: number | string;
  volume: number | string | null;
  open_qfq: number | string | null;
  high_qfq: number | string | null;
  low_qfq: number | string | null;
  close_qfq: number | string | null;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function isSwLevel(value: string): value is SwLevel {
  return value === 'sw1' || value === 'sw2' || value === 'sw3';
}

/**
 * 将指数元数据与 ETF 池行合并为列表项；缺跟踪指数的池行会被跳过。
 * 同一指数多只 ETF 时保留 aum_yi 更大者。
 */
export function mapIndicesWithEtf(
  indices: IndicesRow[],
  pool: EtfPoolRow[]
): IndexWithEtf[] {
  const indexByCode = new Map(indices.map(row => [row.code, row]));
  const bestByIndex = new Map<string, IndexWithEtf>();

  for (const etf of pool) {
    const indexCode = etf.tracking_index_code;
    if (!indexCode) {
      continue;
    }
    const index = indexByCode.get(indexCode);
    if (!index) {
      continue;
    }

    const candidate: IndexWithEtf = {
      indexCode,
      indexName: index.name,
      category: index.category,
      displayOrder: index.display_order,
      etfCode: etf.etf_code,
      etfName: etf.etf_name,
      aumYi: toNumber(etf.aum_yi),
      avgDailyTurnoverYi: toNumber(etf.avg_daily_turnover_yi),
      premiumDiscount: toNumber(etf.premium_discount),
      expenseRatio: toNumber(etf.expense_ratio),
      snapshotDate: etf.snapshot_date,
    };

    const existing = bestByIndex.get(indexCode);
    if (!existing) {
      bestByIndex.set(indexCode, candidate);
      continue;
    }
    const existingAum = existing.aumYi ?? -1;
    const candidateAum = candidate.aumYi ?? -1;
    if (candidateAum > existingAum) {
      bestByIndex.set(indexCode, candidate);
    }
  }

  return Array.from(bestByIndex.values()).sort((a, b) => a.displayOrder - b.displayOrder);
}

/** 映射估值快照。 */
export function mapValuationRow(row: EtfValuationRow | null): ValuationSnapshot | null {
  if (!row) {
    return null;
  }
  return {
    indexCode: row.tracking_index_code,
    tradeDate: row.trade_date,
    currentPeTtm: toNumber(row.current_pe_ttm),
    peTtmAvg5y: toNumber(row.pe_ttm_avg_5y),
    peTtmAvg10y: toNumber(row.pe_ttm_avg_10y),
  };
}

export function mapIndexMetricRows(rows: IndexMetricRow[]): IndexMetricPoint[] {
  return rows.map(row => ({
    indexCode: row.index_code,
    tradeDate: row.trade_date,
    close: toNumber(row.close),
    peTtm: toNumber(row.pe_ttm),
    pb: toNumber(row.pb),
  })).filter(row => row.close != null || row.peTtm != null || row.pb != null);
}

/** 映射行业权重行。 */
export function mapIndustryWeightRows(rows: IndustryWeightRow[]): IndustryWeight[] {
  return rows
    .filter(row => isSwLevel(row.sw_level))
    .map(row => ({
      indexCode: row.index_code,
      asOfDate: row.as_of_date,
      swLevel: row.sw_level as SwLevel,
      industryName: row.industry_name,
      weightPct: toNumber(row.weight_pct) ?? 0,
    }));
}

/**
 * 映射 ETF 日 K：优先前复权 OHLC，缺任一 qfq 则回退不复权。
 */
export function mapEtfDailyRows(rows: EtfDailyRow[]): EtfPriceBar[] {
  return rows
    .map(row => {
      const qfqOpen = toNumber(row.open_qfq);
      const qfqHigh = toNumber(row.high_qfq);
      const qfqLow = toNumber(row.low_qfq);
      const qfqClose = toNumber(row.close_qfq);
      const useQfq =
        qfqOpen != null && qfqHigh != null && qfqLow != null && qfqClose != null;

      const open = useQfq ? qfqOpen : toNumber(row.open);
      const high = useQfq ? qfqHigh : toNumber(row.high);
      const low = useQfq ? qfqLow : toNumber(row.low);
      const close = useQfq ? qfqClose : toNumber(row.close);

      if (open == null || high == null || low == null || close == null) {
        return null;
      }

      return {
        etfCode: row.etf_code,
        tradeDate: row.trade_date,
        open,
        high,
        low,
        close,
        volume: toNumber(row.volume),
        adjusted: useQfq,
      } satisfies EtfPriceBar;
    })
    .filter((bar): bar is EtfPriceBar => bar != null);
}
