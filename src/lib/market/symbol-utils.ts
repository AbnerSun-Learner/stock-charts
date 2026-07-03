import type { Exchange } from '@/types/market';

/** 上交所代码以 5/6 开头，其余默认深交所 */
export function inferExchange(symbol: string): Exchange {
  const normalized = symbol.replace(/\D/g, '');
  if (/^(5|6)/.test(normalized)) return 'SSE';
  return 'SZSE';
}

/** 东方财富 secid：1=上交所，0=深交所 */
export function toEastMoneySecId(symbol: string, exchange: Exchange): string {
  const code = symbol.replace(/\D/g, '');
  const market = exchange === 'SSE' ? '1' : '0';
  return `${market}.${code}`;
}

/** 新浪 symbol：sh510300 / sz159915 */
export function toSinaSymbol(symbol: string, exchange: Exchange): string {
  const code = symbol.replace(/\D/g, '');
  return exchange === 'SSE' ? `sh${code}` : `sz${code}`;
}

/** YYYYMMDD 或 YYYY-MM-DD → YYYYMMDD */
export function normalizeDateInput(date?: string): string | undefined {
  if (!date) return undefined;
  return date.replace(/-/g, '');
}

/** 比较 YYYYMMDD 字符串 */
export function isDateInRange(
  date: string,
  start?: string,
  end?: string
): boolean {
  const normalized = date.replace(/-/g, '');
  if (start && normalized < start.replace(/-/g, '')) return false;
  if (end && normalized > end.replace(/-/g, '')) return false;
  return true;
}

/** 解析东方财富 K 线单行：日期,开,收,高,低,量,额,... */
export function parseEastMoneyKlineRow(row: string): {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
} | null {
  const parts = row.split(',');
  if (parts.length < 7) return null;

  const [date, open, close, high, low, volume, amount] = parts;
  const parsed = [open, close, high, low, volume, amount].map(Number);
  if (parsed.some(v => !Number.isFinite(v))) return null;

  return {
    date,
    open: parsed[0],
    close: parsed[1],
    high: parsed[2],
    low: parsed[3],
    volume: parsed[4],
    amount: parsed[5],
  };
}
