import type {
  CashAccount,
  CashFlow,
  CashRebuildInput,
  Currency,
  TradeRecord,
} from '@/types/investment';
import { finalizeInternal, isMoneyEqual, MONEY_EPSILON } from '@/lib/investment/money';

export type CashRebuildError =
  | 'negative_ledger_amount'
  | 'invalid_fx_exchange'
  | 'zero_amount_event';

export type CashRebuildResult =
  | {
      ok: true;
      balances: Record<Currency, number>;
      warnings: string[];
    }
  | { ok: false; error: CashRebuildError; message: string };

export interface CashReconcileDiff {
  currency: Currency;
  rebuilt: number;
  snapshot: number;
  diff: number;
}

function settlementDateOf(trade: TradeRecord): string {
  return trade.settlementDate ?? trade.tradeDate;
}

function assertNonNegativeAmount(amount: number, label: string): string | null {
  if (!(amount > 0)) {
    return `${label} 必须为正数（账本金额非负且零金额不入库）`;
  }
  return null;
}

export type CashFlowDeltaResult =
  | { ok: true; delta: Record<string, number> }
  | { ok: false; error: CashRebuildError; message: string };

/**
 * 现金流对余额的方向：由 type 决定，金额本身非负。
 */
export function cashFlowDeltaByType(flow: CashFlow): CashFlowDeltaResult {
  const amountError = assertNonNegativeAmount(flow.amount, 'CashFlow.amount');
  if (amountError) {
    return { ok: false, error: 'negative_ledger_amount', message: amountError };
  }

  if (flow.type === 'fx_exchange') {
    if (!flow.counterCurrency || flow.counterAmount === undefined) {
      return {
        ok: false,
        error: 'invalid_fx_exchange',
        message: 'fx_exchange 必须提供 counterCurrency 与 counterAmount',
      };
    }
    if (flow.counterCurrency === flow.currency) {
      return {
        ok: false,
        error: 'invalid_fx_exchange',
        message: 'fx_exchange 双腿币种必须不同',
      };
    }
    const counterError = assertNonNegativeAmount(
      flow.counterAmount,
      'CashFlow.counterAmount'
    );
    if (counterError) {
      return { ok: false, error: 'negative_ledger_amount', message: counterError };
    }
    return {
      ok: true,
      delta: {
        [flow.currency]: flow.amount,
        [flow.counterCurrency]: -flow.counterAmount,
      },
    };
  }

  // 成交嵌入费税：有 linkedTradeId 时不再影响现金
  if ((flow.type === 'fee' || flow.type === 'tax') && flow.linkedTradeId) {
    return { ok: true, delta: {} };
  }

  switch (flow.type) {
    case 'deposit':
    case 'dividend':
    case 'interest':
      return { ok: true, delta: { [flow.currency]: flow.amount } };
    case 'withdrawal':
    case 'fee':
    case 'tax':
      return { ok: true, delta: { [flow.currency]: -flow.amount } };
    default:
      return { ok: false, error: 'invalid_fx_exchange', message: '未知现金流类型' };
  }
}

/**
 * 成交结算对现金的影响（价款 ± 费税，方向由 side 决定）。
 */
export function tradeCashDelta(trade: TradeRecord): Record<string, number> {
  const notional = trade.price * trade.quantity;
  const fee = Math.max(0, trade.fee);
  const tax = Math.max(0, trade.tax);
  if (trade.side === 'buy') {
    return { [trade.currency]: -(notional + fee + tax) };
  }
  return { [trade.currency]: notional - fee - tax };
}

function applyDelta(
  balances: Record<string, number>,
  delta: Record<string, number>
): void {
  for (const [currency, amount] of Object.entries(delta)) {
    balances[currency] = finalizeInternal((balances[currency] ?? 0) + amount);
  }
}

/**
 * 以基准日现金快照为起点，仅重放基准日之后的现金流与成交结算。
 */
export function rebuildCashBalances(input: CashRebuildInput): CashRebuildResult {
  const balances: Record<string, number> = {
    CNY: 0,
    HKD: 0,
    USD: 0,
  };
  const warnings: string[] = [];

  for (const row of input.baselineBalances) {
    balances[row.currency] = finalizeInternal(row.balance);
  }

  const flows = input.cashFlows
    .filter(flow => flow.flowDate > input.cashBaselineDate)
    .sort((a, b) => a.flowDate.localeCompare(b.flowDate) || a.id.localeCompare(b.id));

  for (const flow of flows) {
    const deltaResult = cashFlowDeltaByType(flow);
    if (!deltaResult.ok) {
      return {
        ok: false,
        error: deltaResult.error,
        message: deltaResult.message,
      };
    }
    applyDelta(balances, deltaResult.delta);
  }

  const trades = input.trades
    .filter(trade => settlementDateOf(trade) > input.cashBaselineDate)
    .sort(
      (a, b) =>
        settlementDateOf(a).localeCompare(settlementDateOf(b)) ||
        a.id.localeCompare(b.id)
    );

  for (const trade of trades) {
    if (trade.fee < 0 || trade.tax < 0 || trade.price < 0 || trade.quantity < 0) {
      return {
        ok: false,
        error: 'negative_ledger_amount',
        message: `成交 ${trade.id} 金额字段不得为负`,
      };
    }
    applyDelta(balances, tradeCashDelta(trade));
  }

  const typed: Record<Currency, number> = {
    CNY: balances.CNY ?? 0,
    HKD: balances.HKD ?? 0,
    USD: balances.USD ?? 0,
  };

  for (const currency of ['CNY', 'HKD', 'USD'] as Currency[]) {
    if (!input.baselineBalances.some(row => row.currency === currency)) {
      warnings.push(`基准日缺少 ${currency} 余额，按 0 处理`);
    }
  }

  return { ok: true, balances: typed, warnings };
}

/**
 * 与非基准日 cash_accounts 对账，返回差异（不静默覆盖）。
 */
export function reconcileCashAccounts(params: {
  rebuilt: Record<Currency, number>;
  snapshots: CashAccount[];
}): CashReconcileDiff[] {
  const diffs: CashReconcileDiff[] = [];
  for (const snapshot of params.snapshots) {
    const rebuilt = params.rebuilt[snapshot.currency] ?? 0;
    if (!isMoneyEqual(rebuilt, snapshot.balance)) {
      diffs.push({
        currency: snapshot.currency,
        rebuilt,
        snapshot: snapshot.balance,
        diff: finalizeInternal(rebuilt - snapshot.balance),
      });
    }
  }
  return diffs;
}

/** 判断某币种现金是否足以支付金额（容差内视为足够） */
export function hasSufficientCash(
  balances: Record<Currency, number>,
  currency: Currency,
  required: number
): boolean {
  return (balances[currency] ?? 0) + MONEY_EPSILON >= required;
}
