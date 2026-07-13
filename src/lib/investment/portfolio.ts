import type {
  CashAccount,
  Currency,
  ETFInstrument,
  Position,
  TargetAllocation,
} from '@/types/investment';
import {
  finalizeInternal,
  isWeightEqual,
  isWeightSumOne,
  MONEY_EPSILON,
  roundWeight,
  WEIGHT_EPSILON,
} from '@/lib/investment/money';
import {
  assertBusinessInstrumentId,
  isVirtualCashCode,
} from '@/lib/investment/market-data';

export type PortfolioCalcError =
  | 'missing_valuation'
  | 'invalid_target_weights'
  | 'virtual_cash_in_targets'
  | 'invalid_instrument_id';

export type PortfolioCalcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: PortfolioCalcError; message: string };

export interface PortfolioTotals {
  totalMarketValueBase: number;
  cashValueBase: number;
  totalAssetsBase: number;
  cashRatio: number;
}

export interface CurrencyExposure {
  currency: Currency;
  marketValueBase: number;
  cashBalanceBase: number;
  totalBase: number;
  weight: number;
}

export interface ConcentrationItem {
  instrumentId: string;
  marketValueBase: number;
  weight: number;
}

export interface CategoryWeight {
  assetClass: string;
  marketValueBase: number;
  weight: number;
}

export type TargetWeightValidationError =
  | 'sum_not_one'
  | 'watch_nonzero'
  | 'virtual_cash_code'
  | 'invalid_instrument_id'
  | 'negative_weight'
  | 'cash_target_out_of_range';

export interface TargetWeightValidation {
  ok: boolean;
  errors: TargetWeightValidationError[];
  sumInstrumentWeights: number;
  totalWithCash: number;
}

/**
 * 校验目标权重：sum(标的) + cashTargetWeight = 1；watch=0；无虚拟现金码。
 */
export function validateTargetAllocationWeights(
  targets: TargetAllocation[],
  cashTargetWeight: number
): TargetWeightValidation {
  const errors: TargetWeightValidationError[] = [];
  if (cashTargetWeight < 0 || cashTargetWeight > 1) {
    errors.push('cash_target_out_of_range');
  }

  let sumInstrumentWeights = 0;
  for (const target of targets) {
    if (target.targetWeight < 0) {
      errors.push('negative_weight');
    }
    if (isVirtualCashCode(target.instrumentId)) {
      errors.push('virtual_cash_code');
    }
    try {
      assertBusinessInstrumentId(target.instrumentId);
    } catch {
      errors.push('invalid_instrument_id');
    }
    if (target.allocationRole === 'watch' && !isWeightEqual(target.targetWeight, 0)) {
      errors.push('watch_nonzero');
    }
    sumInstrumentWeights += target.targetWeight;
  }

  sumInstrumentWeights = roundWeight(sumInstrumentWeights);
  const totalWithCash = roundWeight(sumInstrumentWeights + cashTargetWeight);
  if (!isWeightSumOne(totalWithCash)) {
    errors.push('sum_not_one');
  }

  return {
    ok: errors.length === 0,
    errors: Array.from(new Set(errors)),
    sumInstrumentWeights,
    totalWithCash,
  };
}

function requireValuedPosition(
  position: Position
): { ok: true; marketValueBase: number } | { ok: false; message: string } {
  try {
    assertBusinessInstrumentId(position.instrumentId);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'invalid instrumentId',
    };
  }
  if (
    position.marketValueBase === undefined ||
    !Number.isFinite(position.marketValueBase)
  ) {
    return {
      ok: false,
      message: `持仓 ${position.instrumentId} 缺少 marketValueBase`,
    };
  }
  return { ok: true, marketValueBase: position.marketValueBase };
}

/**
 * 汇总总资产、现金比例（现金来自分币种账户折算合计）。
 */
export function calculatePortfolioTotals(
  positions: Position[],
  cashAccounts: CashAccount[]
): PortfolioCalcResult<PortfolioTotals> {
  let totalMarketValueBase = 0;
  for (const position of positions) {
    const valued = requireValuedPosition(position);
    if (!valued.ok) {
      return { ok: false, error: 'missing_valuation', message: valued.message };
    }
    totalMarketValueBase += valued.marketValueBase;
  }

  let cashValueBase = 0;
  for (const account of cashAccounts) {
    cashValueBase += account.balanceBase;
  }

  totalMarketValueBase = finalizeInternal(totalMarketValueBase);
  cashValueBase = finalizeInternal(cashValueBase);
  const totalAssetsBase = finalizeInternal(totalMarketValueBase + cashValueBase);
  const cashRatio =
    Math.abs(totalAssetsBase) <= MONEY_EPSILON
      ? 0
      : roundWeight(cashValueBase / totalAssetsBase);

  return {
    ok: true,
    value: {
      totalMarketValueBase,
      cashValueBase,
      totalAssetsBase,
      cashRatio,
    },
  };
}

/**
 * 分币种暴露（持仓市值 + 现金，均已折基础币种）。
 */
export function calculateCurrencyExposure(
  positions: Position[],
  cashAccounts: CashAccount[]
): PortfolioCalcResult<CurrencyExposure[]> {
  const map = new Map<
    Currency,
    { marketValueBase: number; cashBalanceBase: number }
  >();

  const ensure = (currency: Currency) => {
    const existing = map.get(currency);
    if (existing) {
      return existing;
    }
    const created = { marketValueBase: 0, cashBalanceBase: 0 };
    map.set(currency, created);
    return created;
  };

  for (const position of positions) {
    const valued = requireValuedPosition(position);
    if (!valued.ok) {
      return { ok: false, error: 'missing_valuation', message: valued.message };
    }
    ensure(position.currency).marketValueBase += valued.marketValueBase;
  }
  for (const account of cashAccounts) {
    ensure(account.currency).cashBalanceBase += account.balanceBase;
  }

  const rows = Array.from(map.entries()).map(([currency, row]) => {
    const totalBase = finalizeInternal(
      row.marketValueBase + row.cashBalanceBase
    );
    return {
      currency,
      marketValueBase: finalizeInternal(row.marketValueBase),
      cashBalanceBase: finalizeInternal(row.cashBalanceBase),
      totalBase,
      weight: 0,
    };
  });

  const grand = rows.reduce((sum, row) => sum + row.totalBase, 0);
  for (const row of rows) {
    row.weight =
      Math.abs(grand) <= MONEY_EPSILON ? 0 : roundWeight(row.totalBase / grand);
  }
  return { ok: true, value: rows };
}

/**
 * 单标的集中度（相对总资产）。
 */
export function calculateConcentration(
  positions: Position[],
  cashAccounts: CashAccount[]
): PortfolioCalcResult<ConcentrationItem[]> {
  const totals = calculatePortfolioTotals(positions, cashAccounts);
  if (!totals.ok) {
    return totals;
  }
  const items: ConcentrationItem[] = [];
  for (const position of positions) {
    const valued = requireValuedPosition(position);
    if (!valued.ok) {
      return { ok: false, error: 'missing_valuation', message: valued.message };
    }
    items.push({
      instrumentId: position.instrumentId,
      marketValueBase: valued.marketValueBase,
      weight:
        Math.abs(totals.value.totalAssetsBase) <= MONEY_EPSILON
          ? 0
          : roundWeight(valued.marketValueBase / totals.value.totalAssetsBase),
    });
  }
  return { ok: true, value: items };
}

/**
 * 按资产类别聚合权重（需标的主数据提供 assetClass）。
 */
export function calculateCategoryWeights(
  positions: Position[],
  instruments: ETFInstrument[],
  cashAccounts: CashAccount[]
): PortfolioCalcResult<CategoryWeight[]> {
  const totals = calculatePortfolioTotals(positions, cashAccounts);
  if (!totals.ok) {
    return totals;
  }
  const bySymbol = new Map(instruments.map(item => [item.symbol, item]));
  const map = new Map<string, number>();

  for (const position of positions) {
    const valued = requireValuedPosition(position);
    if (!valued.ok) {
      return { ok: false, error: 'missing_valuation', message: valued.message };
    }
    const instrument = bySymbol.get(position.instrumentId);
    const assetClass = instrument?.assetClass ?? 'unknown';
    map.set(assetClass, (map.get(assetClass) ?? 0) + valued.marketValueBase);
  }

  const rows = Array.from(map.entries()).map(([assetClass, marketValueBase]) => ({
    assetClass,
    marketValueBase: finalizeInternal(marketValueBase),
    weight:
      Math.abs(totals.value.totalAssetsBase) <= MONEY_EPSILON
        ? 0
        : roundWeight(marketValueBase / totals.value.totalAssetsBase),
  }));
  return { ok: true, value: rows };
}

/**
 * 事实源规则：持仓快照不得静默覆盖成交事实。
 * 仅返回差异，调用方必须人工确认，禁止静默改写 trades。
 */
export function detectPositionTradeShareDiff(params: {
  ledgerSharesByInstrument: Record<string, number>;
  snapshotPositions: Position[];
}): Array<{ instrumentId: string; ledgerShares: number; snapshotShares: number }> {
  const diffs: Array<{
    instrumentId: string;
    ledgerShares: number;
    snapshotShares: number;
  }> = [];
  for (const position of params.snapshotPositions) {
    assertBusinessInstrumentId(position.instrumentId);
    const ledgerShares = params.ledgerSharesByInstrument[position.instrumentId] ?? 0;
    if (Math.abs(ledgerShares - position.shares) > WEIGHT_EPSILON) {
      diffs.push({
        instrumentId: position.instrumentId,
        ledgerShares,
        snapshotShares: position.shares,
      });
    }
  }
  return diffs;
}

/**
 * 导入持仓：只更新持仓快照，原样返回既有目标配置（不得改写）。
 */
export function applyPositionImportKeepingTargets<T>(params: {
  existingTargets: T;
  importedPositions: Position[];
}): { positions: Position[]; targets: T } {
  for (const position of params.importedPositions) {
    assertBusinessInstrumentId(position.instrumentId);
  }
  return {
    positions: params.importedPositions,
    targets: params.existingTargets,
  };
}
