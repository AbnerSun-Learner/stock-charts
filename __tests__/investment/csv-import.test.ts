import {
  assignOccurrenceIndexes,
  buildTradeContentFingerprint,
  dedupeByBrokerRef,
  dedupeFeeTaxCashFlows,
  detectCrossBatchConflicts,
  importPositionsWithoutTouchingTargets,
  parseTradeCsv,
} from '@/lib/investment/csv-import';
import type { CashFlow, TargetAllocation, TradeRecord } from '@/types/investment';

describe('csv-import', () => {
  it('空文件与缺列报错', () => {
    expect(parseTradeCsv({ csvText: '', importBatchId: 'b1' }).issues[0].code).toBe(
      'empty_file'
    );
    const missing = parseTradeCsv({
      csvText: 'tradeDate,side,price,quantity\n2024-01-01,buy,1,1',
      importBatchId: 'b1',
    });
    expect(missing.issues[0].code).toBe('missing_columns');
  });

  it('同批同日同价多笔保留，occurrenceIndex 递增', () => {
    const csv = [
      'tradeDate,instrumentId,side,price,quantity,fee,tax,currency',
      '2024-01-01,510300,buy,1,10,0,0,CNY',
      '2024-01-01,510300,buy,1,10,0,0,CNY',
    ].join('\n');
    const parsed = parseTradeCsv({ csvText: csv, importBatchId: 'batch-1' });
    expect(parsed.issues).toHaveLength(0);
    expect(parsed.trades).toHaveLength(2);
    expect(parsed.trades[0].contentFingerprint).toBe(
      parsed.trades[1].contentFingerprint
    );
    expect(parsed.trades[0].occurrenceIndex).toBe(0);
    expect(parsed.trades[1].occurrenceIndex).toBe(1);
    expect(parsed.trades[0].instrumentId).toBe('510300.SH');
  });

  it('文件列重排 fingerprint 稳定', () => {
    const a = buildTradeContentFingerprint({
      tradeDate: '2024-01-01',
      instrumentId: '510300.SH',
      side: 'buy',
      price: 1,
      quantity: 10,
      fee: 0,
      tax: 0,
      currency: 'CNY',
    });
    const csv1 = [
      'tradeDate,instrumentId,side,price,quantity,fee,tax,currency',
      '2024-01-01,510300.SH,buy,1,10,0,0,CNY',
    ].join('\n');
    const csv2 = [
      'currency,tax,fee,quantity,price,side,instrumentId,tradeDate',
      'CNY,0,0,10,1,buy,510300.SH,2024-01-01',
    ].join('\n');
    const p1 = parseTradeCsv({ csvText: csv1, importBatchId: 'b1' });
    const p2 = parseTradeCsv({ csvText: csv2, importBatchId: 'b2' });
    expect(p1.trades[0].contentFingerprint).toBe(a);
    expect(p2.trades[0].contentFingerprint).toBe(a);
  });

  it('跨批相同 fingerprint 生成冲突清单，不静默跳过', () => {
    const fingerprint = buildTradeContentFingerprint({
      tradeDate: '2024-01-01',
      instrumentId: '510300.SH',
      side: 'buy',
      price: 1,
      quantity: 10,
      fee: 0,
      tax: 0,
      currency: 'CNY',
    });
    const incoming = assignOccurrenceIndexes([
      {
        contentFingerprint: fingerprint,
        tradeDate: '2024-01-01',
        instrumentId: '510300.SH',
        side: 'buy' as const,
        price: 1,
        quantity: 10,
        currency: 'CNY' as const,
      },
    ]);
    const conflicts = detectCrossBatchConflicts({
      incoming,
      existingFingerprints: new Map([[fingerprint, ['old-hash']]]),
    });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].contentFingerprint).toBe(fingerprint);
  });

  it('有 brokerRef 跨文件去重', () => {
    const trade: TradeRecord = {
      id: '1',
      instrumentId: '510300.SH',
      tradeDate: '2024-01-01',
      side: 'buy',
      price: 1,
      quantity: 1,
      fee: 0,
      tax: 0,
      currency: 'CNY',
      fxRateToBase: 1,
      executionIntent: 'manual',
      brokerRef: 'BR-1',
    };
    const { accepted, skipped } = dedupeByBrokerRef([trade], new Set(['BR-1']));
    expect(accepted).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });

  it('币种缺失报错', () => {
    const csv = [
      'tradeDate,instrumentId,side,price,quantity',
      '2024-01-01,510300,buy,1,10',
    ].join('\n');
    const parsed = parseTradeCsv({ csvText: csv, importBatchId: 'b1' });
    expect(parsed.issues.some(issue => issue.code === 'missing_currency')).toBe(
      true
    );
  });

  it('成交费税与费用行去重：有 linkedTradeId 才丢弃，疑似重复不静默删除', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        instrumentId: '510300.SH',
        tradeDate: '2024-01-01',
        side: 'buy',
        price: 10,
        quantity: 10,
        fee: 5,
        tax: 1,
        currency: 'CNY',
        fxRateToBase: 1,
        executionIntent: 'manual',
      },
    ];
    const cashFlows: CashFlow[] = [
      {
        id: 'f1',
        flowDate: '2024-01-01',
        type: 'fee',
        amount: 5,
        amountBase: 5,
        currency: 'CNY',
        fxRateToBase: 1,
        linkedTradeId: 't1',
      },
      {
        id: 'f2',
        flowDate: '2024-01-01',
        type: 'fee',
        amount: 5,
        amountBase: 5,
        currency: 'CNY',
        fxRateToBase: 1,
      },
    ];
    const result = dedupeFeeTaxCashFlows({ trades, cashFlows });
    expect(result.discarded.map(flow => flow.id)).toEqual(['f1']);
    expect(result.suspectedDuplicates.map(flow => flow.id)).toEqual(['f2']);
    expect(result.cashFlows.map(flow => flow.id)).toEqual(['f2']);
  });

  it('导入持仓不覆盖目标配置', () => {
    const targets: TargetAllocation[] = [
      {
        id: '1',
        instrumentId: '510300.SH',
        targetWeight: 1,
        allocationRole: 'core',
        updatedAt: '2024-01-01',
      },
    ];
    const result = importPositionsWithoutTouchingTargets({
      existingTargets: targets,
      importedPositions: [
        {
          id: 'p1',
          instrumentId: '510300.SH',
          asOfDate: '2024-02-01',
          shares: 1,
          averageCost: 1,
          currency: 'CNY',
        },
      ],
    });
    expect(result.targets).toBe(targets);
  });
});
