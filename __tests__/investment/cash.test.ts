import { rebuildCashBalances, reconcileCashAccounts } from '@/lib/investment/cash';
import type { CashFlow, TradeRecord } from '@/types/investment';

function flow(partial: Partial<CashFlow> & Pick<CashFlow, 'id' | 'flowDate' | 'type' | 'amount' | 'currency'>): CashFlow {
  return {
    fxRateToBase: 1,
    amountBase: partial.amount,
    ...partial,
  };
}

function trade(partial: Partial<TradeRecord> & Pick<TradeRecord, 'id' | 'tradeDate' | 'side' | 'price' | 'quantity' | 'currency'>): TradeRecord {
  return {
    instrumentId: '510300.SH',
    fee: 0,
    tax: 0,
    fxRateToBase: 1,
    executionIntent: 'manual',
    ...partial,
  };
}

describe('cash rebuild', () => {
  it('以基准日快照为起点，仅重放之后事件', () => {
    const result = rebuildCashBalances({
      cashBaselineDate: '2024-01-01',
      baselineBalances: [
        { currency: 'CNY', balance: 10000 },
        { currency: 'HKD', balance: 1000 },
        { currency: 'USD', balance: 100 },
      ],
      cashFlows: [
        flow({
          id: 'before',
          flowDate: '2024-01-01',
          type: 'deposit',
          amount: 9999,
          currency: 'CNY',
        }),
        flow({
          id: 'after',
          flowDate: '2024-01-02',
          type: 'deposit',
          amount: 500,
          currency: 'CNY',
        }),
      ],
      trades: [
        trade({
          id: 't0',
          tradeDate: '2024-01-01',
          side: 'buy',
          price: 1,
          quantity: 100,
          currency: 'CNY',
        }),
        trade({
          id: 't1',
          tradeDate: '2024-01-03',
          side: 'buy',
          price: 10,
          quantity: 10,
          fee: 1,
          tax: 0.5,
          currency: 'CNY',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    // 10000 + 500 - (100+1+0.5) = 10398.5；基准日成交不重放
    expect(result.balances.CNY).toBe(10398.5);
    expect(result.balances.HKD).toBe(1000);
    expect(result.balances.USD).toBe(100);
  });

  it('type 决定增减方向，金额本身非负', () => {
    const result = rebuildCashBalances({
      cashBaselineDate: '2024-01-01',
      baselineBalances: [{ currency: 'CNY', balance: 1000 }],
      cashFlows: [
        flow({
          id: 'd',
          flowDate: '2024-01-02',
          type: 'deposit',
          amount: 100,
          currency: 'CNY',
        }),
        flow({
          id: 'w',
          flowDate: '2024-01-03',
          type: 'withdrawal',
          amount: 40,
          currency: 'CNY',
        }),
        flow({
          id: 'div',
          flowDate: '2024-01-04',
          type: 'dividend',
          amount: 10,
          currency: 'CNY',
        }),
        flow({
          id: 'fee',
          flowDate: '2024-01-05',
          type: 'fee',
          amount: 5,
          currency: 'CNY',
        }),
      ],
      trades: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.balances.CNY).toBe(1065);
  });

  it('换汇双腿同时影响两币种', () => {
    const result = rebuildCashBalances({
      cashBaselineDate: '2024-01-01',
      baselineBalances: [
        { currency: 'USD', balance: 100 },
        { currency: 'CNY', balance: 0 },
      ],
      cashFlows: [
        flow({
          id: 'fx',
          flowDate: '2024-01-02',
          type: 'fx_exchange',
          amount: 700,
          currency: 'CNY',
          counterCurrency: 'USD',
          counterAmount: 100,
        }),
      ],
      trades: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.balances.CNY).toBe(700);
    expect(result.balances.USD).toBe(0);
  });

  it('买卖结算含费税；同批 linkedTradeId 费用流水不双扣', () => {
    const result = rebuildCashBalances({
      cashBaselineDate: '2024-01-01',
      baselineBalances: [{ currency: 'CNY', balance: 10000 }],
      cashFlows: [
        flow({
          id: 'embedded',
          flowDate: '2024-01-02',
          type: 'fee',
          amount: 5,
          currency: 'CNY',
          linkedTradeId: 't1',
        }),
      ],
      trades: [
        trade({
          id: 't1',
          tradeDate: '2024-01-02',
          side: 'buy',
          price: 10,
          quantity: 100,
          fee: 5,
          tax: 1,
          currency: 'CNY',
        }),
        trade({
          id: 't2',
          tradeDate: '2024-01-03',
          side: 'sell',
          price: 12,
          quantity: 50,
          fee: 2,
          tax: 1,
          currency: 'CNY',
        }),
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    // 买：-(1000+5+1)；卖：+(600-2-1)；embedded fee 跳过
    expect(result.balances.CNY).toBe(10000 - 1006 + 597);
  });

  it('多币种分别记账', () => {
    const result = rebuildCashBalances({
      cashBaselineDate: '2024-01-01',
      baselineBalances: [
        { currency: 'CNY', balance: 100 },
        { currency: 'HKD', balance: 200 },
        { currency: 'USD', balance: 300 },
      ],
      cashFlows: [
        flow({
          id: 'h',
          flowDate: '2024-01-02',
          type: 'deposit',
          amount: 50,
          currency: 'HKD',
        }),
      ],
      trades: [
        trade({
          id: 'u',
          tradeDate: '2024-01-02',
          side: 'buy',
          price: 10,
          quantity: 2,
          currency: 'USD',
          instrumentId: 'VOO.US',
        }),
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.balances.CNY).toBe(100);
    expect(result.balances.HKD).toBe(250);
    expect(result.balances.USD).toBe(280);
  });

  it('与非基准日快照对账返回差异', () => {
    const diffs = reconcileCashAccounts({
      rebuilt: { CNY: 100, HKD: 0, USD: 0 },
      snapshots: [
        {
          id: '1',
          currency: 'CNY',
          asOfDate: '2024-02-01',
          balance: 90,
          fxRateToBase: 1,
          balanceBase: 90,
        },
      ],
    });
    expect(diffs).toHaveLength(1);
    expect(diffs[0].diff).toBe(10);
  });
});
