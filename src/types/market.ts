/** 交易所 */
export type Exchange = 'SSE' | 'SZSE';

/** 数据源优先级 */
export type SourceRank = 'primary' | 'backup';

/** K 线频率 */
export type KlineFrequency = 'daily' | 'weekly' | 'monthly';

/** 市场 API 元数据（成功/失败共用） */
export interface MarketApiMeta {
  source: string;
  sourceRank: SourceRank;
  timestamp: string;
  stale: boolean;
  fallbackUsed: boolean;
  warnings: string[];
}

/** 市场 API 成功响应（HTTP 200，含 stale 缓存降级） */
export interface MarketApiResponseOk<T> extends MarketApiMeta {
  data: T;
}

/** 市场 API 失败响应（HTTP 503，无可用数据） */
export interface MarketApiResponseError extends MarketApiMeta {
  data: null;
  source: 'none';
  stale: true;
}

/** 统一 API 响应结构 */
export type MarketApiResponse<T> =
  | MarketApiResponseOk<T>
  | MarketApiResponseError;

/** 是否包含可用业务数据 */
export function isMarketApiResponseOk<T>(
  response: MarketApiResponse<T>
): response is MarketApiResponseOk<T> {
  return response.data !== null;
}

/** 单根 K 线 */
export interface KlineBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

/** ETF K 线查询参数 */
export interface EtfKlineQuery {
  symbol: string;
  exchange: Exchange;
  start?: string;
  end?: string;
  frequency?: KlineFrequency;
}

/** ETF K 线结果 */
export interface EtfKlineData {
  symbol: string;
  exchange: Exchange;
  frequency: KlineFrequency;
  bars: KlineBar[];
}

/** 估值指标类型 */
export type ValuationMetric = 'PE' | 'PB' | 'DIVIDEND_YIELD';

/** 单条估值历史记录 */
export interface ValuationRecord {
  date: string;
  pe?: number;
  pb?: number;
  dividendYield?: number;
}

/** 指数估值查询参数 */
export interface IndexValuationQuery {
  indexCode: string;
  start?: string;
  end?: string;
}

/** 指数估值结果 */
export interface IndexValuationData {
  indexCode: string;
  records: ValuationRecord[];
}

/** 实时报价 */
export interface EtfQuote {
  symbol: string;
  exchange: Exchange;
  currentPrice: number;
  bestBid?: number;
  bestAsk?: number;
  premiumDiscountPct?: number;
  amount?: number;
}

/** 数据 provider 请求上下文 */
export interface ProviderContext {
  signal?: AbortSignal;
}

/** 数据 provider 契约 */
export interface MarketDataProvider<TQuery, TData> {
  name: string;
  rank: SourceRank;
  fetch: (query: TQuery, context?: ProviderContext) => Promise<TData>;
}

/** fallback 配置 */
export interface FallbackConfig<TQuery, TData> {
  cacheKey: (query: TQuery) => string;
  cacheTtlMs: number;
  providers: MarketDataProvider<TQuery, TData>[];
}
