/** 申万行业分级。 */
export type SwLevel = 'sw1' | 'sw2' | 'sw3';

/** 指数列表项（已关联池内跟踪 ETF）。 */
export interface IndexWithEtf {
  indexCode: string;
  indexName: string;
  category: string;
  displayOrder: number;
  etfCode: string;
  etfName: string;
  aumYi: number | null;
  avgDailyTurnoverYi: number | null;
  premiumDiscount: number | null;
  expenseRatio: number | null;
  snapshotDate: string;
}

/** 跟踪指数估值快照（PE_TTM）。 */
export interface ValuationSnapshot {
  indexCode: string;
  tradeDate: string;
  currentPeTtm: number | null;
  peTtmAvg5y: number | null;
  peTtmAvg10y: number | null;
}

/** 估值相对历史均值的判定结果。 */
export type ValuationComparison = 'below' | 'equal' | 'above';

export interface ValuationJudgement {
  comparisonTo5y: ValuationComparison | null;
  comparisonTo10y: ValuationComparison | null;
  deviationFrom5yPct: number | null;
  deviationFrom10yPct: number | null;
  summary: string;
}

/** 单条行业权重。 */
export interface IndustryWeight {
  indexCode: string;
  asOfDate: string;
  swLevel: SwLevel;
  industryName: string;
  weightPct: number;
}

/** 行业权重 TopN 聚合后的展示行。 */
export interface IndustryWeightBar {
  name: string;
  weightPct: number;
  isOther: boolean;
}

export type AnalysisWindow = 'all' | '10y' | '5y';
export type ValuationMetricKey = 'peTtm' | 'pb';

/** 指数日度走势与估值历史点。 */
export interface IndexMetricPoint {
  indexCode: string;
  tradeDate: string;
  close: number | null;
  peTtm: number | null;
  pb: number | null;
}

export interface ValuationBin {
  from: number;
  to: number;
  count: number;
  containsCurrent: boolean;
}

export interface ValuationStatistics {
  current: number;
  average: number;
  minimum: number;
  maximum: number;
  percentile: number;
  sampleSize: number;
  tradeDate: string;
  insufficientSamples: boolean;
  bins: ValuationBin[];
}

export interface DrawdownSummary {
  currentDrawdownPct: number;
  maximumDrawdownPct: number;
  latestClose: number;
  latestPeak: number;
  peakDate: string;
  troughDate: string;
}

/** ETF 日 K（优先前复权映射后的 OHLC）。 */
export interface EtfPriceBar {
  etfCode: string;
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  adjusted: boolean;
}
