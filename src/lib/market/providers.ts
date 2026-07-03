import type {
  EtfKlineData,
  EtfKlineQuery,
  IndexValuationData,
  IndexValuationQuery,
  KlineBar,
  ProviderContext,
  ValuationRecord,
} from '@/types/market';
import {
  inferExchange,
  isDateInRange,
  normalizeDateInput,
  parseEastMoneyKlineRow,
  toEastMoneySecId,
  toSinaSymbol,
} from './symbol-utils';

const USER_AGENT =
  'Mozilla/5.0 (compatible; StockCharts/1.0; +https://github.com/stock-charts)';

const KLINE_FREQ_MAP = { daily: 101, weekly: 102, monthly: 103 } as const;

async function fetchJson<T>(
  url: string,
  context?: ProviderContext
): Promise<T> {
  const response = await fetch(url, {
    signal: context?.signal,
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  return response.json() as Promise<T>;
}

interface EastMoneyKlinePayload {
  data?: { klines?: string[] };
}

/** 东方财富 ETF 日 K（主源） */
export async function fetchEtfKlineEastMoney(
  query: EtfKlineQuery,
  context?: ProviderContext
): Promise<EtfKlineData> {
  const exchange = query.exchange ?? inferExchange(query.symbol);
  const secid = toEastMoneySecId(query.symbol, exchange);
  const frequency = query.frequency ?? 'daily';
  const beg = normalizeDateInput(query.start) ?? '0';
  const end = normalizeDateInput(query.end) ?? '20500000';

  const url =
    'https://push2his.eastmoney.com/api/qt/stock/kline/get' +
    `?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13` +
    '&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61' +
    `&klt=${KLINE_FREQ_MAP[frequency]}&fqt=0&beg=${beg}&end=${end}`;

  const payload = await fetchJson<EastMoneyKlinePayload>(url, context);
  const rows = payload.data?.klines ?? [];
  if (rows.length === 0) {
    throw new Error(`EastMoney K线为空: ${query.symbol}`);
  }

  const bars: KlineBar[] = [];
  for (const row of rows) {
    const parsed = parseEastMoneyKlineRow(row);
    if (!parsed) continue;
    if (!isDateInRange(parsed.date, query.start, query.end)) continue;
    bars.push(parsed);
  }

  if (bars.length === 0) {
    throw new Error(`EastMoney K线过滤后为空: ${query.symbol}`);
  }

  return {
    symbol: query.symbol.replace(/\D/g, ''),
    exchange,
    frequency,
    bars,
  };
}

interface SinaKlineRow {
  day: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

/** 新浪 ETF 日 K（备源） */
export async function fetchEtfKlineSina(
  query: EtfKlineQuery,
  context?: ProviderContext
): Promise<EtfKlineData> {
  const exchange = query.exchange ?? inferExchange(query.symbol);
  const sinaSymbol = toSinaSymbol(query.symbol, exchange);
  const url =
    'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/' +
    `CN_MarketData.getKLineData?symbol=${sinaSymbol}&scale=240&ma=no&datalen=1023`;

  const rows = await fetchJson<SinaKlineRow[]>(url, context);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Sina K线为空: ${query.symbol}`);
  }

  const frequency = query.frequency ?? 'daily';
  const bars: KlineBar[] = rows
    .map(row => ({
      date: row.day,
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
      amount: 0,
    }))
    .filter(
      bar =>
        Number.isFinite(bar.close) &&
        isDateInRange(bar.date, query.start, query.end)
    );

  if (bars.length === 0) {
    throw new Error(`Sina K线过滤后为空: ${query.symbol}`);
  }

  return {
    symbol: query.symbol.replace(/\D/g, ''),
    exchange,
    frequency,
    bars,
  };
}

interface EastMoneyValuationPayload {
  result?: {
    data?: Array<{
      TRADE_DATE?: string;
      PE_TTM?: number;
      PB_MRQ?: number;
      DIVIDEND_YIELD?: number;
    }>;
  };
}

/** 东方财富指数估值（主源） */
export async function fetchIndexValuationEastMoney(
  query: IndexValuationQuery,
  context?: ProviderContext
): Promise<IndexValuationData> {
  const filter = `(INDEX_CODE="${query.indexCode}")`;
  const url =
    'https://datacenter-web.eastmoney.com/api/data/v1/get' +
    '?sortColumns=TRADE_DATE&sortTypes=-1&pageSize=5000&pageNumber=1' +
    '&reportName=RPT_INDEX_VALUATION&columns=ALL&source=WEB&client=WEB' +
    `&filter=${encodeURIComponent(filter)}`;

  const payload = await fetchJson<EastMoneyValuationPayload>(url, context);
  const rows = payload.result?.data ?? [];
  if (rows.length === 0) {
    throw new Error(`EastMoney 估值为空: ${query.indexCode}`);
  }

  const records: ValuationRecord[] = rows
    .map(row => ({
      date: row.TRADE_DATE ?? '',
      pe: row.PE_TTM,
      pb: row.PB_MRQ,
      dividendYield: row.DIVIDEND_YIELD,
    }))
    .filter(r => r.date.length > 0)
    .filter(r => isDateInRange(r.date, query.start, query.end))
    .reverse();

  return { indexCode: query.indexCode, records };
}
