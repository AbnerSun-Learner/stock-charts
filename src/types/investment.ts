import type {
  AggregatedGridRow,
  GridLeg,
  GridStrategyParamsV2,
} from '@/types/grid-v2';

export type Market = 'CN' | 'HK' | 'US';
export type Currency = 'CNY' | 'HKD' | 'USD';
/** 标的级角色；现金不在此枚举——现金目标见 PortfolioSettings.cashTargetWeight */
export type AllocationRole = 'core' | 'satellite' | 'watch';
export type ExecutionIntent = 'rebalance' | 'grid' | 'manual';
export type TradeSide = 'buy' | 'sell';
/** 外部现金流：仅 deposit/withdrawal 参与 XIRR（符号由 type 转换，持久化金额恒非负） */
export type ExternalCashFlowType = 'deposit' | 'withdrawal';
/** 内部现金流：影响现金余额与 TWR，不参与 XIRR 外部口径 */
export type InternalCashFlowType =
  | 'dividend'
  | 'fee'
  | 'tax'
  | 'interest'
  | 'fx_exchange';
export type CashFlowType = ExternalCashFlowType | InternalCashFlowType;
export type DecisionStatus = 'open' | 'validated' | 'invalidated' | 'archived';
export type RebalanceTriggerReason =
  | 'absolute_drift'
  | 'relative_drift'
  | 'calendar_review'
  | 'cash_deployment';

export interface PortfolioSettings {
  id: string;
  baseCurrency: Currency;
  benchmarkId?: string;
  relativeDriftThreshold: number;
  absoluteDriftThreshold: number;
  reviewCadenceDays: number;
  /**
   * 现金目标权重（0–1）；与 sum(target_allocations.targetWeight) 之和必须为 1。
   * 不是虚拟 ETF，不写入 target_allocations。
   */
  cashTargetWeight: number;
  /**
   * 现金重建基准日；缺省则取最早完整 cash_accounts 快照日。
   * 仅重放该日之后的现金流与成交结算。
   */
  cashBaselineDate?: string;
}

export interface TargetAllocation {
  id: string;
  /** 真实 ETF 规范代码；禁止 CASH 虚拟码 */
  instrumentId: string;
  /** 0–1；与 cashTargetWeight 合计为 1；watch 必须为 0 */
  targetWeight: number;
  /** 仅 core / satellite / watch；禁止 cash */
  allocationRole: AllocationRole;
  updatedAt: string;
}

/**
 * 标的主数据。共享池与用户扩展的稳定业务键均为 `symbol`（规范代码，如 510300.SH）。
 * `id` 仅在用户扩展表 `etf_instruments` 行内等于 UUID；业务表一律存 `symbol`，禁止存 UUID。
 */
export interface ETFInstrument {
  id: string;
  /** 规范代码，如 510300.SH / 2800.HK / VOO.US；业务行 instrumentId 与此对齐 */
  symbol: string;
  name: string;
  market: Market;
  currency: Currency;
  assetClass: string;
  trackingIndex?: string;
  benchmarkId?: string;
  expenseRatio?: number;
  distributionPolicy?: string;
  liquidityTag?: string;
  valuationTag?: string;
  /** 新建目标配置时的默认角色；生效角色以 TargetAllocation.allocationRole 为准 */
  defaultAllocationRole?: AllocationRole;
  gridEligible: boolean;
  /** 来源：shared=池内只读；custom=用户 etf_instruments 扩展 */
  source: 'shared' | 'custom';
}

export interface Position {
  id: string;
  /** 规范代码，与 ETFInstrument.symbol 一致 */
  instrumentId: string;
  asOfDate: string;
  shares: number;
  averageCost: number;
  /**
   * 以下估值字段在缺价格/缺汇率时可缺失；领域层用 optional 表达，
   * 计算前必须校验，缺失则返回结构化错误（禁止用 0 或 1 静默填充）。
   */
  currentPrice?: number;
  marketValue?: number;
  currency: Currency;
  fxRateToBase?: number;
  marketValueBase?: number;
}

export interface TradeRecord {
  id: string;
  /** 规范代码 */
  instrumentId: string;
  tradeDate: string;
  settlementDate?: string;
  side: TradeSide;
  price: number;
  quantity: number;
  /** 与本笔成交直接相关的佣金；现金重建只从成交结算扣一次，不得再生成 CashFlow.fee */
  fee: number;
  /** 与本笔成交直接相关的印花税等；同上，禁止落入 CashFlow.tax */
  tax: number;
  currency: Currency;
  fxRateToBase: number;
  executionIntent: ExecutionIntent;
  rebalancePlanId?: string;
  gridPlanId?: string;
  decisionLogId?: string;
  /** 券商成交流水号；有则优先用于去重 */
  brokerRef?: string;
  /**
   * 内容指纹：不含 CSV 行号；覆盖日期、规范代码、方向、价格、数量、费用、币种。
   * 同批次内稳定；跨文件仅在 fingerprint 全局唯一时可用于自动去重。
   */
  contentFingerprint?: string;
  /**
   * **仅对当前导入批次内**相同 contentFingerprint 的第几次出现（从 0 起）。
   * 保留同日同价多笔；跨批次不可假设编号对齐。
   */
  occurrenceIndex?: number;
  /** 单批次内幂等键：contentFingerprint + occurrenceIndex（无 brokerRef 时） */
  importHash?: string;
  /** 所属导入批次；用于整批撤销与失败摘要 */
  importBatchId?: string;
  note?: string;
}

export interface CashFlow {
  id: string;
  flowDate: string;
  type: CashFlowType;
  /**
   * 金额一律非负。对现金余额的增减由 type（及换汇双腿角色）决定，不在持久化层用正负号表达方向。
   * XIRR 投资者视角符号由 type 转换得到，禁止把 deposit.amountBase 存成负数。
   */
  amount: number;
  currency: Currency;
  fxRateToBase: number;
  /** 非负；基础币种折算额 */
  amountBase: number;
  /** 分红、费用等需归因到标的时使用（规范代码） */
  instrumentId?: string;
  /**
   * 仅当本条现金流依附某笔成交做审计关联时可选；
   * 有 linkedTradeId 时，本条不得再以 fee/tax 影响现金（现金已由成交结算计入）。
   */
  linkedTradeId?: string;
  /** fx_exchange 的出账币种；必须与 currency 不同 */
  counterCurrency?: Currency;
  /** fx_exchange 出账金额，非负 */
  counterAmount?: number;
  importBatchId?: string;
  note?: string;
}

export interface CashAccount {
  id: string;
  currency: Currency;
  asOfDate: string;
  balance: number;
  fxRateToBase: number;
  balanceBase: number;
}

/** 现金重建输入：基准日快照 + 仅重放基准日之后的事件 */
export interface CashRebuildInput {
  cashBaselineDate: string;
  baselineBalances: Array<{ currency: Currency; balance: number }>;
  cashFlows: CashFlow[];
  trades: TradeRecord[];
}

export interface PriceBar {
  /** 规范代码 */
  instrumentId: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  currency: Currency;
}

export interface FxRate {
  date: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
}

export interface Benchmark {
  id: string;
  code: string;
  name: string;
  currency: Currency;
  description?: string;
}

export interface BenchmarkPrice {
  benchmarkId: string;
  date: string;
  close: number;
  currency: Currency;
}

export interface PortfolioSnapshot {
  id: string;
  asOfDate: string;
  /** 持仓市值（已折算基础币种） */
  totalMarketValueBase: number;
  /** 现金余额（已折算基础币种） */
  cashValueBase: number;
  /** 总资产 = totalMarketValueBase + cashValueBase */
  totalAssetsBase: number;
}

export type XirrError =
  | 'empty_cash_flows'
  | 'no_sign_change'
  | 'does_not_converge'
  | 'multiple_roots'
  | 'missing_fx_rate'
  | 'invalid_terminal_value';

/**
 * XIRR：外部出入金（deposit 为负、withdrawal 为正）
 * + 估值日终值作为最后一笔正向现金流。
 */
export interface CalculateXirrInput {
  externalCashFlows: Array<{
    date: string;
    /** 已折算为基础币种；deposit 记为负，withdrawal 记为正 */
    amountBase: number;
  }>;
  /** 估值日组合总资产（基础币种），作为终端正向现金流 */
  terminalValueBase: number;
  valuationDate: string;
}

export type CalculateXirrResult =
  | { ok: true; value: number }
  | { ok: false; error: XirrError };

export type TwrError =
  | 'insufficient_snapshots'
  | 'non_contiguous_snapshots'
  | 'missing_fx_rate'
  | 'zero_prior_value';

/**
 * TWR：在明确的估值日序列上分段。
 * r_t = (V_t - CF_t) / V_(t-1) - 1；TWR = Π(1 + r_t) - 1。
 * CF_t = 该估值日结束前发生的外部净现金流（组合口径：入金为正、出金为负）。
 */
export interface CalculateTwrInput {
  /** 按 asOfDate 升序；必须覆盖预期估值日序列，否则 non_contiguous_snapshots */
  snapshots: PortfolioSnapshot[];
  externalCashFlows: Array<{ date: string; amountBase: number }>;
  /** 现金流时点：end_of_day（默认）——计入当日 CF_t */
  cashFlowTiming: 'end_of_day';
  /**
   * 预期估值日序列（自然日或产品生成的估值日历）。
   * 多市场组合不以单一交易所交易日为准。
   */
  expectedValuationDates: string[];
}

export type CalculateTwrResult =
  | { ok: true; value: number }
  | { ok: false; error: TwrError };

export interface ImportBatch {
  id: string;
  sourceFileName: string;
  sourceFileHash: string;
  importedAt: string;
  status: 'pending' | 'committed' | 'partial' | 'rolled_back';
  summary?: {
    inserted: number;
    skippedDuplicate: number;
    failed: number;
  };
}

export interface GridPlanSnapshot {
  id: string;
  instrumentId: string;
  createdAt: string;
  status: 'draft' | 'active' | 'paused' | 'closed';
  params: GridStrategyParamsV2;
  legs: GridLeg[];
  aggregatedRows: AggregatedGridRow[];
  totalBudget: number;
  remainingBudget: number;
}

export interface RebalancePlan {
  id: string;
  createdAt: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  reason: string;
  triggerReason: RebalanceTriggerReason;
  /** 生成计划时从 target_allocations 复制的标的权重快照（不含现金；现金见当时 cashTargetWeight） */
  targetWeights: Record<string, number>;
  /** 生成计划时的现金目标权重快照 */
  cashTargetWeight: number;
  plannedTrades: RebalancePlannedTrade[];
}

export interface RebalancePlannedTrade {
  instrumentId: string;
  side: TradeSide;
  plannedAmountBase: number;
}

export interface DecisionLog {
  id: string;
  createdAt: string;
  title: string;
  hypothesis: string;
  validationCondition: string;
  invalidCondition: string;
  reviewDate: string;
  status: DecisionStatus;
  linkedInstrumentId?: string;
  linkedTradeId?: string;
  linkedRebalancePlanId?: string;
  linkedGridPlanId?: string;
}

export interface ReviewEntry {
  id: string;
  periodStart: string;
  periodEnd: string;
  reportMarkdown: string;
  createdAt: string;
}
