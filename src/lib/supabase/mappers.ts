import type {
  AllocationRole,
  CashAccount,
  CashFlow,
  CashFlowType,
  Currency,
  DecisionLog,
  DecisionStatus,
  ETFInstrument,
  ExecutionIntent,
  FxRate,
  GridPlanSnapshot,
  Market,
  PortfolioSettings,
  PortfolioSnapshot,
  Position,
  PriceBar,
  RebalancePlan,
  RebalancePlannedTrade,
  RebalanceTriggerReason,
  ReviewEntry,
  TargetAllocation,
  TradeRecord,
  TradeSide,
} from '@/types/investment';
import type {
  AggregatedGridRow,
  GridLeg,
  GridStrategyParamsV2,
} from '@/types/grid-v2';
import { toCanonicalSymbol, toShortCode } from '@/lib/investment/market-data';

export interface PortfolioSettingsRow {
  id: string;
  base_currency: Currency;
  benchmark_id: string | null;
  relative_drift_threshold: number;
  absolute_drift_threshold: number;
  review_cadence_days: number;
  /** §4.5 落地前可能不存在 */
  cash_target_weight?: number | null;
  cash_baseline_date?: string | null;
}

export function mapPortfolioSettings(row: PortfolioSettingsRow): PortfolioSettings {
  return {
    id: row.id,
    baseCurrency: row.base_currency,
    benchmarkId: row.benchmark_id ?? undefined,
    relativeDriftThreshold: Number(row.relative_drift_threshold),
    absoluteDriftThreshold: Number(row.absolute_drift_threshold),
    reviewCadenceDays: Number(row.review_cadence_days),
    // 列未就绪时领域层默认 0，避免静默当成已配置现金目标
    cashTargetWeight: Number(row.cash_target_weight ?? 0),
    cashBaselineDate: row.cash_baseline_date ?? undefined,
  };
}

export function toPortfolioSettingsWrite(
  settings: Omit<PortfolioSettings, 'id'> & { id?: string }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    base_currency: settings.baseCurrency,
    benchmark_id: settings.benchmarkId ?? null,
    relative_drift_threshold: settings.relativeDriftThreshold,
    absolute_drift_threshold: settings.absoluteDriftThreshold,
    review_cadence_days: settings.reviewCadenceDays,
    updated_at: new Date().toISOString(),
  };
  if (settings.id) {
    payload.id = settings.id;
  }
  // cash_target_weight / cash_baseline_date 待 §4.5 列就绪后再写入，避免未知列报错
  return payload;
}

export function mapTargetAllocation(row: {
  id: string;
  instrument_id: string;
  target_weight: number;
  allocation_role: AllocationRole;
  updated_at: string;
}): TargetAllocation {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    targetWeight: Number(row.target_weight),
    allocationRole: row.allocation_role,
    updatedAt: row.updated_at,
  };
}

export function mapEtfInstrument(row: {
  id: string;
  symbol: string;
  name: string;
  market: Market;
  currency: Currency;
  asset_class: string;
  tracking_index: string | null;
  benchmark_id: string | null;
  expense_ratio: number | null;
  distribution_policy: string | null;
  liquidity_tag: string | null;
  valuation_tag: string | null;
  default_allocation_role: AllocationRole | null;
  grid_eligible: boolean;
}): ETFInstrument {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    market: row.market,
    currency: row.currency,
    assetClass: row.asset_class,
    trackingIndex: row.tracking_index ?? undefined,
    benchmarkId: row.benchmark_id ?? undefined,
    expenseRatio: row.expense_ratio != null ? Number(row.expense_ratio) : undefined,
    distributionPolicy: row.distribution_policy ?? undefined,
    liquidityTag: row.liquidity_tag ?? undefined,
    valuationTag: row.valuation_tag ?? undefined,
    defaultAllocationRole: row.default_allocation_role ?? undefined,
    gridEligible: row.grid_eligible,
    source: 'custom',
  };
}

export function mapSharedPoolInstrument(row: {
  etf_code: string;
  etf_name: string;
  category: string | null;
  tracking_index_code: string | null;
  expense_ratio: number | null;
}): ETFInstrument {
  const symbol = toCanonicalSymbol(row.etf_code, 'CN');
  return {
    id: `shared:${symbol}`,
    symbol,
    name: row.etf_name,
    market: 'CN',
    currency: 'CNY',
    assetClass: row.category ?? 'unknown',
    trackingIndex: row.tracking_index_code ?? undefined,
    benchmarkId: row.tracking_index_code ?? undefined,
    expenseRatio: row.expense_ratio != null ? Number(row.expense_ratio) : undefined,
    gridEligible: false,
    source: 'shared',
  };
}

export function mapPosition(row: {
  id: string;
  instrument_id: string;
  as_of_date: string;
  shares: number;
  average_cost: number;
  current_price: number | null;
  market_value: number | null;
  currency: Currency;
  fx_rate_to_base: number | null;
  market_value_base: number | null;
}): Position {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    asOfDate: row.as_of_date,
    shares: Number(row.shares),
    averageCost: Number(row.average_cost),
    currentPrice:
      row.current_price == null ? undefined : Number(row.current_price),
    marketValue: row.market_value == null ? undefined : Number(row.market_value),
    currency: row.currency,
    fxRateToBase:
      row.fx_rate_to_base == null ? undefined : Number(row.fx_rate_to_base),
    marketValueBase:
      row.market_value_base == null ? undefined : Number(row.market_value_base),
  };
}

/** 当前库 positions 估值列 NOT NULL；写入前必须齐全 */
export function toPositionWrite(position: Position): Record<string, unknown> {
  if (
    position.currentPrice === undefined ||
    position.marketValue === undefined ||
    position.fxRateToBase === undefined ||
    position.marketValueBase === undefined
  ) {
    throw new Error('写入 positions 需要完整估值字段（当前库列仍为 NOT NULL）');
  }
  return {
    instrument_id: position.instrumentId,
    as_of_date: position.asOfDate,
    shares: position.shares,
    average_cost: position.averageCost,
    current_price: position.currentPrice,
    market_value: position.marketValue,
    currency: position.currency,
    fx_rate_to_base: position.fxRateToBase,
    market_value_base: position.marketValueBase,
    updated_at: new Date().toISOString(),
  };
}

export function mapTrade(row: {
  id: string;
  instrument_id: string;
  trade_date: string;
  settlement_date: string | null;
  side: TradeSide;
  price: number;
  quantity: number;
  fee: number;
  tax: number;
  currency: Currency;
  fx_rate_to_base: number;
  execution_intent: ExecutionIntent;
  rebalance_plan_id: string | null;
  grid_plan_id: string | null;
  decision_log_id: string | null;
  broker_ref: string | null;
  import_hash: string | null;
  note: string | null;
}): TradeRecord {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    tradeDate: row.trade_date,
    settlementDate: row.settlement_date ?? undefined,
    side: row.side,
    price: Number(row.price),
    quantity: Number(row.quantity),
    fee: Number(row.fee),
    tax: Number(row.tax),
    currency: row.currency,
    fxRateToBase: Number(row.fx_rate_to_base),
    executionIntent: row.execution_intent,
    rebalancePlanId: row.rebalance_plan_id ?? undefined,
    gridPlanId: row.grid_plan_id ?? undefined,
    decisionLogId: row.decision_log_id ?? undefined,
    brokerRef: row.broker_ref ?? undefined,
    importHash: row.import_hash ?? undefined,
    note: row.note ?? undefined,
  };
}

export function toTradeWrite(trade: Omit<TradeRecord, 'id'> & { id?: string }): Record<string, unknown> {
  return {
    ...(trade.id ? { id: trade.id } : {}),
    instrument_id: trade.instrumentId,
    trade_date: trade.tradeDate,
    settlement_date: trade.settlementDate ?? null,
    side: trade.side,
    price: trade.price,
    quantity: trade.quantity,
    fee: trade.fee,
    tax: trade.tax,
    currency: trade.currency,
    fx_rate_to_base: trade.fxRateToBase,
    execution_intent: trade.executionIntent,
    rebalance_plan_id: trade.rebalancePlanId ?? null,
    grid_plan_id: trade.gridPlanId ?? null,
    decision_log_id: trade.decisionLogId ?? null,
    broker_ref: trade.brokerRef ?? null,
    import_hash: trade.importHash ?? null,
    note: trade.note ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function mapCashFlow(row: {
  id: string;
  flow_date: string;
  type: CashFlowType;
  amount: number;
  currency: Currency;
  fx_rate_to_base: number;
  amount_base: number;
  instrument_id: string | null;
  counter_currency: Currency | null;
  counter_amount: number | null;
  note: string | null;
}): CashFlow {
  return {
    id: row.id,
    flowDate: row.flow_date,
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency,
    fxRateToBase: Number(row.fx_rate_to_base),
    amountBase: Number(row.amount_base),
    instrumentId: row.instrument_id ?? undefined,
    counterCurrency: row.counter_currency ?? undefined,
    counterAmount:
      row.counter_amount == null ? undefined : Number(row.counter_amount),
    note: row.note ?? undefined,
  };
}

export function toCashFlowWrite(
  flow: Omit<CashFlow, 'id'> & { id?: string }
): Record<string, unknown> {
  return {
    ...(flow.id ? { id: flow.id } : {}),
    flow_date: flow.flowDate,
    type: flow.type,
    amount: flow.amount,
    currency: flow.currency,
    fx_rate_to_base: flow.fxRateToBase,
    amount_base: flow.amountBase,
    instrument_id: flow.instrumentId ?? null,
    counter_currency: flow.counterCurrency ?? null,
    counter_amount: flow.counterAmount ?? null,
    note: flow.note ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function mapCashAccount(row: {
  id: string;
  currency: Currency;
  as_of_date: string;
  balance: number;
  fx_rate_to_base: number;
  balance_base: number;
}): CashAccount {
  return {
    id: row.id,
    currency: row.currency,
    asOfDate: row.as_of_date,
    balance: Number(row.balance),
    fxRateToBase: Number(row.fx_rate_to_base),
    balanceBase: Number(row.balance_base),
  };
}

export function mapFxRate(row: {
  rate_date: string;
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
}): FxRate {
  return {
    date: row.rate_date,
    fromCurrency: row.from_currency,
    toCurrency: row.to_currency,
    rate: Number(row.rate),
  };
}

export function mapPriceBar(row: {
  etf_code: string;
  trade_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  open_qfq: number | null;
  high_qfq: number | null;
  low_qfq: number | null;
  close_qfq: number | null;
  volume: number | null;
}): PriceBar {
  // 回测优先前复权；缺则回退原始 OHLC
  const open = row.open_qfq ?? row.open ?? Number(row.close);
  const high = row.high_qfq ?? row.high ?? Number(row.close);
  const low = row.low_qfq ?? row.low ?? Number(row.close);
  const close = row.close_qfq ?? row.close;
  return {
    instrumentId: toCanonicalSymbol(row.etf_code, 'CN'),
    date: row.trade_date,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: row.volume == null ? undefined : Number(row.volume),
    currency: 'CNY',
  };
}

export function mapRebalancePlan(row: {
  id: string;
  created_at: string;
  status: RebalancePlan['status'];
  reason: string;
  trigger_reason: RebalanceTriggerReason;
  target_weights: Record<string, number>;
  planned_trades: RebalancePlannedTrade[];
  cash_target_weight?: number | null;
}): RebalancePlan {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    reason: row.reason,
    triggerReason: row.trigger_reason,
    targetWeights: row.target_weights ?? {},
    cashTargetWeight: Number(row.cash_target_weight ?? 0),
    plannedTrades: row.planned_trades ?? [],
  };
}

export function mapGridPlan(row: {
  id: string;
  instrument_id: string;
  created_at: string;
  status: GridPlanSnapshot['status'];
  params: GridStrategyParamsV2;
  legs: GridLeg[];
  aggregated_rows: AggregatedGridRow[];
  total_budget: number;
  remaining_budget: number;
}): GridPlanSnapshot {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    createdAt: row.created_at,
    status: row.status,
    params: row.params,
    legs: row.legs,
    aggregatedRows: row.aggregated_rows,
    totalBudget: Number(row.total_budget),
    remainingBudget: Number(row.remaining_budget),
  };
}

export function mapDecisionLog(row: {
  id: string;
  created_at: string;
  title: string;
  hypothesis: string;
  validation_condition: string;
  invalid_condition: string;
  review_date: string;
  status: DecisionStatus;
  linked_instrument_id: string | null;
  linked_trade_id: string | null;
  linked_rebalance_plan_id: string | null;
  linked_grid_plan_id: string | null;
}): DecisionLog {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    hypothesis: row.hypothesis,
    validationCondition: row.validation_condition,
    invalidCondition: row.invalid_condition,
    reviewDate: row.review_date,
    status: row.status,
    linkedInstrumentId: row.linked_instrument_id ?? undefined,
    linkedTradeId: row.linked_trade_id ?? undefined,
    linkedRebalancePlanId: row.linked_rebalance_plan_id ?? undefined,
    linkedGridPlanId: row.linked_grid_plan_id ?? undefined,
  };
}

export function mapReviewEntry(row: {
  id: string;
  period_start: string;
  period_end: string;
  report_markdown: string;
  created_at: string;
}): ReviewEntry {
  return {
    id: row.id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    reportMarkdown: row.report_markdown,
    createdAt: row.created_at,
  };
}

export function mapPortfolioSnapshot(row: {
  id: string;
  as_of_date: string;
  total_market_value_base: number;
  cash_value_base: number;
  total_assets_base: number;
}): PortfolioSnapshot {
  return {
    id: row.id,
    asOfDate: row.as_of_date,
    totalMarketValueBase: Number(row.total_market_value_base),
    cashValueBase: Number(row.cash_value_base),
    totalAssetsBase: Number(row.total_assets_base),
  };
}

/** 查询 etf_daily 时用短码 */
export function etfDailyLookupCode(canonicalInstrumentId: string): string {
  return toShortCode(canonicalInstrumentId);
}
