import type {
  CashAccount,
  Currency,
  Position,
  RebalancePlan,
  RebalancePlannedTrade,
  RebalanceTriggerReason,
  TargetAllocation,
} from '@/types/investment';
import {
  finalizeInternal,
  isWeightEqual,
  MONEY_EPSILON,
  roundMoney,
  roundWeight,
} from '@/lib/investment/money';
import {
  calculatePortfolioTotals,
  validateTargetAllocationWeights,
} from '@/lib/investment/portfolio';
import { assertBusinessInstrumentId } from '@/lib/investment/market-data';
import { hasSufficientCash } from '@/lib/investment/cash';

export type RebalanceError =
  | 'invalid_target_weights'
  | 'missing_valuation'
  | 'zero_total_assets'
  | 'insufficient_cash';

export interface AllocationDriftRow {
  instrumentId: string | 'CASH_BUCKET';
  currentWeight: number;
  targetWeight: number;
  absoluteDrift: number;
  relativeDrift: number | null;
  currentValueBase: number;
  targetValueBase: number;
  deltaValueBase: number;
}

export type RebalanceCalcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RebalanceError; message: string };

export interface RebalancePlanDraft {
  drifts: AllocationDriftRow[];
  plannedTrades: RebalancePlannedTrade[];
  cashTargetWeight: number;
  targetWeights: Record<string, number>;
  triggerReason: RebalanceTriggerReason;
  buyNotionalBase: number;
  /** 按结算币种汇总的可用现金（原币，非折算） */
  availableCashByCurrency: Record<Currency, number>;
}

function resolveInstrumentCurrency(params: {
  instrumentId: string;
  positions: Position[];
  instrumentCurrencyById?: Record<string, Currency>;
}): Currency | null {
  const fromMap = params.instrumentCurrencyById?.[params.instrumentId];
  if (fromMap) {
    return fromMap;
  }
  const fromPosition = params.positions.find(
    position => position.instrumentId === params.instrumentId
  );
  return fromPosition?.currency ?? null;
}

/**
 * 计算配置偏离：仅基于 target_allocations + cashTargetWeight + 持仓/现金。
 * 网格计划不参与；不引入虚拟 CASH 标的行（现金用 CASH_BUCKET 展示键）。
 */
export function calculateAllocationDrift(params: {
  targets: TargetAllocation[];
  cashTargetWeight: number;
  positions: Position[];
  cashAccounts: CashAccount[];
}): RebalanceCalcResult<AllocationDriftRow[]> {
  const validation = validateTargetAllocationWeights(
    params.targets,
    params.cashTargetWeight
  );
  if (!validation.ok) {
    return {
      ok: false,
      error: 'invalid_target_weights',
      message: `目标权重校验失败: ${validation.errors.join(',')}`,
    };
  }

  const totals = calculatePortfolioTotals(params.positions, params.cashAccounts);
  if (!totals.ok) {
    return { ok: false, error: 'missing_valuation', message: totals.message };
  }
  if (Math.abs(totals.value.totalAssetsBase) <= MONEY_EPSILON) {
    return {
      ok: false,
      error: 'zero_total_assets',
      message: '总资产为 0，无法计算偏离',
    };
  }

  const positionValue = new Map<string, number>();
  for (const position of params.positions) {
    assertBusinessInstrumentId(position.instrumentId);
    const value = position.marketValueBase ?? 0;
    positionValue.set(
      position.instrumentId,
      (positionValue.get(position.instrumentId) ?? 0) + value
    );
  }

  const total = totals.value.totalAssetsBase;
  const rows: AllocationDriftRow[] = [];

  for (const target of params.targets) {
    // watch 目标权重必须为 0，仍可展示当前持仓权重
    const currentValueBase = finalizeInternal(
      positionValue.get(target.instrumentId) ?? 0
    );
    const currentWeight = roundWeight(currentValueBase / total);
    const targetWeight = target.targetWeight;
    const targetValueBase = finalizeInternal(total * targetWeight);
    const absoluteDrift = roundWeight(currentWeight - targetWeight);
    const relativeDrift = isWeightEqual(targetWeight, 0)
      ? null
      : roundWeight(absoluteDrift / targetWeight);
    rows.push({
      instrumentId: target.instrumentId,
      currentWeight,
      targetWeight,
      absoluteDrift,
      relativeDrift,
      currentValueBase,
      targetValueBase,
      deltaValueBase: finalizeInternal(targetValueBase - currentValueBase),
    });
    positionValue.delete(target.instrumentId);
  }

  // 未设目标的持仓：目标 0，便于发现偏离；不生成虚拟现金码
  for (const [instrumentId, value] of Array.from(positionValue.entries())) {
    const currentWeight = roundWeight(value / total);
    rows.push({
      instrumentId,
      currentWeight,
      targetWeight: 0,
      absoluteDrift: currentWeight,
      relativeDrift: null,
      currentValueBase: value,
      targetValueBase: 0,
      deltaValueBase: finalizeInternal(-value),
    });
  }

  const cashCurrent = totals.value.cashValueBase;
  const cashCurrentWeight = roundWeight(cashCurrent / total);
  const cashTargetValue = finalizeInternal(total * params.cashTargetWeight);
  const cashAbs = roundWeight(cashCurrentWeight - params.cashTargetWeight);
  rows.push({
    instrumentId: 'CASH_BUCKET',
    currentWeight: cashCurrentWeight,
    targetWeight: params.cashTargetWeight,
    absoluteDrift: cashAbs,
    relativeDrift: isWeightEqual(params.cashTargetWeight, 0)
      ? null
      : roundWeight(cashAbs / params.cashTargetWeight),
    currentValueBase: cashCurrent,
    targetValueBase: cashTargetValue,
    deltaValueBase: finalizeInternal(cashTargetValue - cashCurrent),
  });

  return { ok: true, value: rows };
}

function pickTriggerReason(
  drifts: AllocationDriftRow[],
  absoluteThreshold: number,
  relativeThreshold: number
): RebalanceTriggerReason {
  for (const row of drifts) {
    if (row.instrumentId === 'CASH_BUCKET') {
      continue;
    }
    if (Math.abs(row.absoluteDrift) >= absoluteThreshold) {
      return 'absolute_drift';
    }
    if (
      row.relativeDrift !== null &&
      Math.abs(row.relativeDrift) >= relativeThreshold
    ) {
      return 'relative_drift';
    }
  }
  const cash = drifts.find(row => row.instrumentId === 'CASH_BUCKET');
  if (cash && cash.currentWeight > cash.targetWeight + absoluteThreshold) {
    return 'cash_deployment';
  }
  return 'calendar_review';
}

/**
 * 基于偏离生成再平衡计划（标的买卖）；现金桶不作为可交易 instrumentId。
 * 现金充足性按结算币种检查，禁止只看折算后总现金。
 */
export function buildRebalancePlan(params: {
  targets: TargetAllocation[];
  cashTargetWeight: number;
  positions: Position[];
  cashAccounts: CashAccount[];
  absoluteDriftThreshold: number;
  relativeDriftThreshold: number;
  requireSufficientCash?: boolean;
  /** 未持仓标的买入时需提供币种；优先于持仓推断 */
  instrumentCurrencyById?: Record<string, Currency>;
}): RebalanceCalcResult<RebalancePlanDraft> {
  const driftResult = calculateAllocationDrift(params);
  if (!driftResult.ok) {
    return driftResult;
  }

  const drifts = driftResult.value;
  const plannedTrades: RebalancePlannedTrade[] = [];
  let buyNotionalBase = 0;
  const buyByCurrency: Partial<Record<Currency, number>> = {};

  for (const row of drifts) {
    if (row.instrumentId === 'CASH_BUCKET') {
      continue;
    }
    if (Math.abs(row.deltaValueBase) <= MONEY_EPSILON) {
      continue;
    }
    if (row.deltaValueBase > 0) {
      plannedTrades.push({
        instrumentId: row.instrumentId,
        side: 'buy',
        plannedAmountBase: roundMoney(row.deltaValueBase),
      });
      buyNotionalBase += row.deltaValueBase;
      const currency = resolveInstrumentCurrency({
        instrumentId: row.instrumentId,
        positions: params.positions,
        instrumentCurrencyById: params.instrumentCurrencyById,
      });
      if (!currency) {
        return {
          ok: false,
          error: 'insufficient_cash',
          message: `无法确定 ${row.instrumentId} 结算币种，不能校验现金`,
        };
      }
      // 同币种且 fx≈1 时，基础币种金额可作为该币种需求近似
      buyByCurrency[currency] =
        (buyByCurrency[currency] ?? 0) + row.deltaValueBase;
    } else {
      plannedTrades.push({
        instrumentId: row.instrumentId,
        side: 'sell',
        plannedAmountBase: roundMoney(-row.deltaValueBase),
      });
    }
  }

  const availableCashByCurrency: Record<Currency, number> = {
    CNY: 0,
    HKD: 0,
    USD: 0,
  };
  for (const account of params.cashAccounts) {
    availableCashByCurrency[account.currency] = finalizeInternal(
      availableCashByCurrency[account.currency] + account.balance
    );
  }

  if (params.requireSufficientCash !== false) {
    for (const currency of Object.keys(buyByCurrency) as Currency[]) {
      const required = buyByCurrency[currency] ?? 0;
      if (!hasSufficientCash(availableCashByCurrency, currency, required)) {
        return {
          ok: false,
          error: 'insufficient_cash',
          message: `再平衡买入需要 ${currency} ${roundMoney(required)}，可用 ${roundMoney(availableCashByCurrency[currency])}`,
        };
      }
    }
  }

  const targetWeights: Record<string, number> = {};
  for (const target of params.targets) {
    targetWeights[target.instrumentId] = target.targetWeight;
  }

  return {
    ok: true,
    value: {
      drifts,
      plannedTrades,
      cashTargetWeight: params.cashTargetWeight,
      targetWeights,
      triggerReason: pickTriggerReason(
        drifts,
        params.absoluteDriftThreshold,
        params.relativeDriftThreshold
      ),
      buyNotionalBase: roundMoney(buyNotionalBase),
      availableCashByCurrency,
    },
  };
}

/**
 * 将草稿转为持久化形状的计划对象（id/时间由调用方注入）。
 */
export function toRebalancePlanEntity(
  draft: RebalancePlanDraft,
  meta: { id: string; createdAt: string; reason: string }
): RebalancePlan {
  return {
    id: meta.id,
    createdAt: meta.createdAt,
    status: 'draft',
    reason: meta.reason,
    triggerReason: draft.triggerReason,
    targetWeights: draft.targetWeights,
    cashTargetWeight: draft.cashTargetWeight,
    plannedTrades: draft.plannedTrades,
  };
}
