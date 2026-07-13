import type { Currency, Market } from '@/types/investment';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** 虚拟现金码（禁止进入业务 instrumentId） */
const VIRTUAL_CASH_CODES = new Set([
  'CASH',
  'CASH.CNY',
  'CASH.HKD',
  'CASH.USD',
  'CASH.CN',
  'CASH.HK',
  'CASH.US',
]);

const MARKET_SUFFIX: Record<Market, string> = {
  CN: 'SH',
  HK: 'HK',
  US: 'US',
};

/**
 * 判断是否为 UUID（禁止作为业务 instrumentId）。
 */
export function isUuidLike(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * 判断是否为虚拟现金码。
 */
export function isVirtualCashCode(value: string): boolean {
  return VIRTUAL_CASH_CODES.has(value.trim().toUpperCase());
}

/**
 * 是否已是规范代码（含市场后缀）。
 */
export function isCanonicalSymbol(value: string): boolean {
  const trimmed = value.trim().toUpperCase();
  if (isUuidLike(trimmed) || isVirtualCashCode(trimmed)) {
    return false;
  }
  return /^[A-Z0-9]+\.(SH|SZ|HK|US|CSI)$/.test(trimmed);
}

/**
 * 短码 / 混合形态 → 规范代码。
 * - `510300` + market CN → `510300.SH`（默认上交所；显式 `.SZ` 优先）
 * - `2800` + HK → `2800.HK`
 * - `VOO` + US → `VOO.US`
 * - 已是规范代码则标准化大小写后返回
 */
export function toCanonicalSymbol(
  code: string,
  market: Market = 'CN'
): string {
  const raw = code.trim().toUpperCase();
  if (!raw) {
    throw new Error('标的代码不能为空');
  }
  if (isUuidLike(raw)) {
    throw new Error('业务层禁止使用 UUID 作为 instrumentId');
  }
  if (isVirtualCashCode(raw)) {
    throw new Error('禁止使用虚拟现金码作为 instrumentId');
  }
  if (isCanonicalSymbol(raw)) {
    return raw;
  }
  // 已有未知后缀时原样保留并大写
  if (raw.includes('.')) {
    return raw;
  }
  if (market === 'CN') {
    // A 股：6 开头上交所，其余默认深交所常见短码
    const suffix = raw.startsWith('5') || raw.startsWith('6') ? 'SH' : 'SZ';
    return `${raw}.${suffix}`;
  }
  return `${raw}.${MARKET_SUFFIX[market]}`;
}

/**
 * 规范代码 → 物理表短码（去掉后缀）。
 */
export function toShortCode(canonical: string): string {
  const upper = canonical.trim().toUpperCase();
  const dot = upper.lastIndexOf('.');
  if (dot <= 0) {
    return upper;
  }
  return upper.slice(0, dot);
}

/**
 * 从规范代码推断市场。
 */
export function marketFromCanonical(canonical: string): Market {
  const upper = canonical.trim().toUpperCase();
  if (upper.endsWith('.HK')) {
    return 'HK';
  }
  if (upper.endsWith('.US')) {
    return 'US';
  }
  return 'CN';
}

/**
 * 市场默认计价币种。
 */
export function defaultCurrencyForMarket(market: Market): Currency {
  if (market === 'HK') {
    return 'HKD';
  }
  if (market === 'US') {
    return 'USD';
  }
  return 'CNY';
}

/**
 * 校验业务 instrumentId：必须是规范代码，禁止 UUID / 虚拟现金 / 裸短码。
 */
export function assertBusinessInstrumentId(instrumentId: string): void {
  if (isUuidLike(instrumentId)) {
    throw new Error('业务层禁止使用 UUID 作为 instrumentId');
  }
  if (isVirtualCashCode(instrumentId)) {
    throw new Error('禁止使用虚拟现金码作为 instrumentId');
  }
  if (!isCanonicalSymbol(instrumentId)) {
    throw new Error(`instrumentId 必须为规范代码，收到: ${instrumentId}`);
  }
}
