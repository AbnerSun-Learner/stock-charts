import type {
  CashFlow,
  Currency,
  ExecutionIntent,
  Position,
  TargetAllocation,
  TradeRecord,
  TradeSide,
} from '@/types/investment';
import { toCanonicalSymbol } from '@/lib/investment/market-data';
import { applyPositionImportKeepingTargets } from '@/lib/investment/portfolio';

export type CsvImportErrorCode =
  | 'empty_file'
  | 'missing_columns'
  | 'invalid_row'
  | 'missing_currency'
  | 'invalid_instrument_id'
  | 'fee_tax_duplicate';

export interface CsvImportIssue {
  code: CsvImportErrorCode;
  message: string;
  rowNumber?: number;
}

export interface TradeCsvRow {
  tradeDate: string;
  instrumentId: string;
  side: TradeSide;
  price: number;
  quantity: number;
  fee?: number;
  tax?: number;
  currency?: Currency;
  settlementDate?: string;
  brokerRef?: string;
  executionIntent?: ExecutionIntent;
  note?: string;
  /** 原始代码（可选，导入后标准化到 instrumentId） */
  rawSymbol?: string;
}

export interface PositionCsvRow {
  asOfDate: string;
  instrumentId: string;
  shares: number;
  averageCost: number;
  currency: Currency;
  currentPrice?: number;
}

export interface ParsedTradeImport {
  trades: TradeRecord[];
  discardedFeeFlows: CashFlow[];
  issues: CsvImportIssue[];
}

export interface CrossBatchConflict {
  contentFingerprint: string;
  existingImportHashes: string[];
  incomingOccurrenceIndex: number;
  incomingPreview: Pick<
    TradeRecord,
    'tradeDate' | 'instrumentId' | 'side' | 'price' | 'quantity' | 'currency'
  >;
}

const TRADE_REQUIRED = [
  'tradeDate',
  'instrumentId',
  'side',
  'price',
  'quantity',
] as const;

/**
 * 稳定字符串哈希（不含行号；浏览器/Node 均可）。
 */
export function stableHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * 内容指纹：日期、规范代码、方向、价格、数量、费用、币种；不含 CSV 行号。
 */
export function buildTradeContentFingerprint(input: {
  tradeDate: string;
  instrumentId: string;
  side: TradeSide;
  price: number;
  quantity: number;
  fee: number;
  tax: number;
  currency: Currency;
}): string {
  const payload = [
    input.tradeDate,
    input.instrumentId,
    input.side,
    String(input.price),
    String(input.quantity),
    String(input.fee),
    String(input.tax),
    input.currency,
  ].join('|');
  return stableHash(payload);
}

export function buildImportHash(
  contentFingerprint: string,
  occurrenceIndex: number
): string {
  return stableHash(`${contentFingerprint}#${occurrenceIndex}`);
}

/**
 * 单批次内为相同 fingerprint 分配 occurrenceIndex（按稳定次序）。
 */
export function assignOccurrenceIndexes<T extends { contentFingerprint: string }>(
  rows: T[]
): Array<T & { occurrenceIndex: number; importHash: string }> {
  const counters = new Map<string, number>();
  return rows.map(row => {
    const next = counters.get(row.contentFingerprint) ?? 0;
    counters.set(row.contentFingerprint, next + 1);
    return {
      ...row,
      occurrenceIndex: next,
      importHash: buildImportHash(row.contentFingerprint, next),
    };
  });
}

/**
 * 跨批次冲突：相同 fingerprint 已存在于库中，且无 brokerRef 可自动去重。
 * 不得静默跳过，返回冲突清单。
 */
export function detectCrossBatchConflicts(params: {
  incoming: Array<{
    contentFingerprint: string;
    occurrenceIndex: number;
    brokerRef?: string;
    tradeDate: string;
    instrumentId: string;
    side: TradeSide;
    price: number;
    quantity: number;
    currency: Currency;
  }>;
  existingFingerprints: Map<string, string[]>;
}): CrossBatchConflict[] {
  const conflicts: CrossBatchConflict[] = [];
  for (const row of params.incoming) {
    if (row.brokerRef) {
      continue;
    }
    const existing = params.existingFingerprints.get(row.contentFingerprint);
    if (!existing || existing.length === 0) {
      continue;
    }
    conflicts.push({
      contentFingerprint: row.contentFingerprint,
      existingImportHashes: existing,
      incomingOccurrenceIndex: row.occurrenceIndex,
      incomingPreview: {
        tradeDate: row.tradeDate,
        instrumentId: row.instrumentId,
        side: row.side,
        price: row.price,
        quantity: row.quantity,
        currency: row.currency,
      },
    });
  }
  return conflicts;
}

function parseCsvLines(text: string): string[][] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  return lines.map(line => {
    // 简易 CSV：支持逗号分隔与双引号字段
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  });
}

function headerIndexMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    map.set(header.trim(), index);
  });
  return map;
}

function cellAt(
  row: string[],
  headers: Map<string, number>,
  name: string
): string | undefined {
  const index = headers.get(name);
  if (index === undefined) {
    return undefined;
  }
  return row[index];
}

/**
 * 解析成交 CSV；同批同指纹多笔保留；文件列重排不影响 fingerprint。
 */
export function parseTradeCsv(params: {
  csvText: string;
  importBatchId: string;
  defaultCurrency?: Currency;
  marketHint?: 'CN' | 'HK' | 'US';
}): ParsedTradeImport {
  const issues: CsvImportIssue[] = [];
  const trimmed = params.csvText.trim();
  if (!trimmed) {
    return {
      trades: [],
      discardedFeeFlows: [],
      issues: [{ code: 'empty_file', message: 'CSV 为空' }],
    };
  }

  const matrix = parseCsvLines(trimmed);
  if (matrix.length < 2) {
    return {
      trades: [],
      discardedFeeFlows: [],
      issues: [{ code: 'empty_file', message: 'CSV 无数据行' }],
    };
  }

  const headers = headerIndexMap(matrix[0]);
  for (const required of TRADE_REQUIRED) {
    if (!headers.has(required)) {
      return {
        trades: [],
        discardedFeeFlows: [],
        issues: [
          {
            code: 'missing_columns',
            message: `缺少必要列: ${required}`,
          },
        ],
      };
    }
  }

  const drafted: Array<Omit<TradeRecord, 'id'> & { contentFingerprint: string }> =
    [];

  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i];
    const rowNumber = i + 1;
    try {
      const tradeDate = cellAt(row, headers, 'tradeDate') ?? '';
      const rawInstrument = cellAt(row, headers, 'instrumentId') ?? '';
      const sideRaw = (cellAt(row, headers, 'side') ?? '').toLowerCase();
      const price = Number(cellAt(row, headers, 'price'));
      const quantity = Number(cellAt(row, headers, 'quantity'));
      const fee = Number(cellAt(row, headers, 'fee') ?? '0');
      const tax = Number(cellAt(row, headers, 'tax') ?? '0');
      const currencyRaw = cellAt(row, headers, 'currency');
      const currency = (currencyRaw || params.defaultCurrency) as
        | Currency
        | undefined;

      if (!currency) {
        issues.push({
          code: 'missing_currency',
          message: '缺少币种',
          rowNumber,
        });
        continue;
      }
      if (sideRaw !== 'buy' && sideRaw !== 'sell') {
        issues.push({
          code: 'invalid_row',
          message: `无效买卖方向: ${sideRaw}`,
          rowNumber,
        });
        continue;
      }
      if (![price, quantity, fee, tax].every(Number.isFinite)) {
        issues.push({
          code: 'invalid_row',
          message: '价格/数量/费税必须为数字',
          rowNumber,
        });
        continue;
      }

      const instrumentId = toCanonicalSymbol(
        rawInstrument,
        params.marketHint ?? 'CN'
      );
      const fingerprint = buildTradeContentFingerprint({
        tradeDate,
        instrumentId,
        side: sideRaw,
        price,
        quantity,
        fee,
        tax,
        currency,
      });

      drafted.push({
        instrumentId,
        tradeDate,
        settlementDate: cellAt(row, headers, 'settlementDate') || undefined,
        side: sideRaw,
        price,
        quantity,
        fee,
        tax,
        currency,
        fxRateToBase: 1,
        executionIntent:
          ((cellAt(row, headers, 'executionIntent') as ExecutionIntent) ||
            'manual'),
        brokerRef: cellAt(row, headers, 'brokerRef') || undefined,
        contentFingerprint: fingerprint,
        importBatchId: params.importBatchId,
        note: cellAt(row, headers, 'note') || undefined,
      });
    } catch (error) {
      issues.push({
        code: 'invalid_instrument_id',
        message: error instanceof Error ? error.message : '标的代码无效',
        rowNumber,
      });
    }
  }

  const withOccurrence = assignOccurrenceIndexes(drafted);
  const trades: TradeRecord[] = withOccurrence.map((row, index) => ({
    ...row,
    id: `${params.importBatchId}-${index}`,
  }));

  return { trades, discardedFeeFlows: [], issues };
}

/**
 * 成交已含费税时，仅丢弃显式 linkedTradeId 指向成交的 fee/tax。
 * 无关联但金额撞车的流水进入 suspectedDuplicates，交由用户确认，禁止静默丢弃。
 */
export function dedupeFeeTaxCashFlows(params: {
  trades: TradeRecord[];
  cashFlows: CashFlow[];
}): {
  cashFlows: CashFlow[];
  discarded: CashFlow[];
  suspectedDuplicates: CashFlow[];
  issues: CsvImportIssue[];
} {
  const tradeIds = new Set(params.trades.map(trade => trade.id));
  const discarded: CashFlow[] = [];
  const suspectedDuplicates: CashFlow[] = [];
  const kept: CashFlow[] = [];
  const issues: CsvImportIssue[] = [];

  for (const flow of params.cashFlows) {
    if (
      (flow.type === 'fee' || flow.type === 'tax') &&
      flow.linkedTradeId &&
      tradeIds.has(flow.linkedTradeId)
    ) {
      discarded.push(flow);
      issues.push({
        code: 'fee_tax_duplicate',
        message: `现金流 ${flow.id} 与成交 ${flow.linkedTradeId} 费税重复，已丢弃`,
      });
      continue;
    }

    if (flow.type === 'fee' || flow.type === 'tax') {
      const duplicate = params.trades.some(
        trade =>
          trade.tradeDate === flow.flowDate &&
          trade.currency === flow.currency &&
          ((flow.type === 'fee' && trade.fee === flow.amount) ||
            (flow.type === 'tax' && trade.tax === flow.amount))
      );
      if (duplicate) {
        suspectedDuplicates.push(flow);
        kept.push(flow);
        issues.push({
          code: 'fee_tax_duplicate',
          message: `现金流 ${flow.id} 疑似与成交费税重复，需人工确认（未静默丢弃）`,
        });
        continue;
      }
    }
    kept.push(flow);
  }

  return { cashFlows: kept, discarded, suspectedDuplicates, issues };
}

/**
 * 解析持仓 CSV；调用方应用 applyPositionImportKeepingTargets，不得覆盖目标配置。
 */
export function parsePositionCsv(params: {
  csvText: string;
  importBatchId: string;
  marketHint?: 'CN' | 'HK' | 'US';
}): { positions: Position[]; issues: CsvImportIssue[] } {
  const issues: CsvImportIssue[] = [];
  const trimmed = params.csvText.trim();
  if (!trimmed) {
    return {
      positions: [],
      issues: [{ code: 'empty_file', message: 'CSV 为空' }],
    };
  }
  const matrix = parseCsvLines(trimmed);
  if (matrix.length < 2) {
    return {
      positions: [],
      issues: [{ code: 'empty_file', message: 'CSV 无数据行' }],
    };
  }
  const headers = headerIndexMap(matrix[0]);
  for (const required of ['asOfDate', 'instrumentId', 'shares', 'averageCost', 'currency']) {
    if (!headers.has(required)) {
      return {
        positions: [],
        issues: [
          { code: 'missing_columns', message: `缺少必要列: ${required}` },
        ],
      };
    }
  }

  const positions: Position[] = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i];
    const rowNumber = i + 1;
    try {
      const instrumentId = toCanonicalSymbol(
        cellAt(row, headers, 'instrumentId') ?? '',
        params.marketHint ?? 'CN'
      );
      const shares = Number(cellAt(row, headers, 'shares'));
      const averageCost = Number(cellAt(row, headers, 'averageCost'));
      const currency = cellAt(row, headers, 'currency') as Currency;
      if (!currency) {
        issues.push({
          code: 'missing_currency',
          message: '缺少币种',
          rowNumber,
        });
        continue;
      }
      positions.push({
        id: `${params.importBatchId}-pos-${i}`,
        instrumentId,
        asOfDate: cellAt(row, headers, 'asOfDate') ?? '',
        shares,
        averageCost,
        currency,
        currentPrice: cellAt(row, headers, 'currentPrice')
          ? Number(cellAt(row, headers, 'currentPrice'))
          : undefined,
      });
    } catch (error) {
      issues.push({
        code: 'invalid_instrument_id',
        message: error instanceof Error ? error.message : '标的代码无效',
        rowNumber,
      });
    }
  }
  return { positions, issues };
}

/**
 * 导入持仓并显式保留目标配置（事实源规则）。
 */
export function importPositionsWithoutTouchingTargets(params: {
  existingTargets: TargetAllocation[];
  importedPositions: Position[];
}): { positions: Position[]; targets: TargetAllocation[] } {
  return applyPositionImportKeepingTargets(params);
}

/**
 * 有 brokerRef 时按 brokerRef 跨文件去重。
 */
export function dedupeByBrokerRef(
  incoming: TradeRecord[],
  existingBrokerRefs: Set<string>
): { accepted: TradeRecord[]; skipped: TradeRecord[] } {
  const accepted: TradeRecord[] = [];
  const skipped: TradeRecord[] = [];
  for (const trade of incoming) {
    if (trade.brokerRef && existingBrokerRefs.has(trade.brokerRef)) {
      skipped.push(trade);
      continue;
    }
    accepted.push(trade);
  }
  return { accepted, skipped };
}
