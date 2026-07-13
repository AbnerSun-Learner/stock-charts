import type { SupabaseClient, User } from '@supabase/supabase-js';
import type {
  CashAccount,
  CashFlow,
  DecisionLog,
  ETFInstrument,
  FxRate,
  GridPlanSnapshot,
  PortfolioSettings,
  PortfolioSnapshot,
  Position,
  PriceBar,
  RebalancePlan,
  ReviewEntry,
  TargetAllocation,
  TradeRecord,
} from '@/types/investment';
import {
  etfDailyLookupCode,
  mapCashAccount,
  mapCashFlow,
  mapDecisionLog,
  mapEtfInstrument,
  mapFxRate,
  mapGridPlan,
  mapPortfolioSettings,
  mapPortfolioSnapshot,
  mapPosition,
  mapPriceBar,
  mapRebalancePlan,
  mapReviewEntry,
  mapSharedPoolInstrument,
  mapTargetAllocation,
  mapTrade,
  toCashFlowWrite,
  toPortfolioSettingsWrite,
  toPositionWrite,
  toTradeWrite,
} from '@/lib/supabase/mappers';
import { assertBusinessInstrumentId } from '@/lib/investment/market-data';
import { dedupeFeeTaxCashFlows } from '@/lib/investment/csv-import';
import {
  AUTH_DISABLED,
  AUTH_REVIEW_USER_ID,
} from '@/lib/supabase/auth-flags';

export type RepositoryErrorCode =
  | 'unauthenticated'
  | 'not_found'
  | 'rpc_unavailable'
  | 'validation'
  | 'supabase_error'
  | 'forbidden_shared_write';

export type RepoResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RepositoryErrorCode; message: string };

type QueryError = { message: string; code?: string } | null;

function fail(
  error: RepositoryErrorCode,
  message: string
): RepoResult<never> {
  return { ok: false, error, message };
}

function fromQueryError(error: QueryError): RepoResult<never> {
  if (!error) {
    return fail('supabase_error', '未知数据库错误');
  }
  // PostgREST：函数不存在
  if (
    error.code === 'PGRST202' ||
    error.message.toLowerCase().includes('could not find the function')
  ) {
    return fail(
      'rpc_unavailable',
      '目标库尚未提供该 RPC（见 scheduled-tasks §4.5 补强 migration）'
    );
  }
  return fail('supabase_error', error.message);
}

/**
 * 投资账本 Repository：用户表经 RLS 读写；共享行情表只读。
 * 权威 DDL：`scheduled-tasks` migration `20260710_cockpit_ledger_and_fx_rates.sql`。
 */
export class InvestmentRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async requireUser(): Promise<RepoResult<User>> {
    // TODO(auth): 审阅结束后删除 AUTH_DISABLED 分支，恢复强制登录校验
    if (AUTH_DISABLED) {
      return {
        ok: true,
        value: { id: AUTH_REVIEW_USER_ID } as User,
      };
    }

    const { data, error } = await this.client.auth.getUser();
    if (error) {
      return fail('unauthenticated', error.message);
    }
    if (!data.user) {
      return fail('unauthenticated', '未登录，无法写入账本数据');
    }
    return { ok: true, value: data.user };
  }

  async getPortfolioSettings(): Promise<RepoResult<PortfolioSettings | null>> {
    const { data, error } = await this.client
      .from('portfolio_settings')
      .select('*')
      .maybeSingle();
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: data ? mapPortfolioSettings(data) : null };
  }

  async upsertPortfolioSettings(
    settings: Omit<PortfolioSettings, 'id'> & { id?: string }
  ): Promise<RepoResult<PortfolioSettings>> {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }
    const payload = {
      ...toPortfolioSettingsWrite(settings),
      user_id: user.value.id,
    };
    const { data, error } = await this.client
      .from('portfolio_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: mapPortfolioSettings(data) };
  }

  async listTargetAllocations(): Promise<RepoResult<TargetAllocation[]>> {
    const { data, error } = await this.client
      .from('target_allocations')
      .select('*')
      .order('instrument_id');
    if (error) {
      return fromQueryError(error);
    }
    return {
      ok: true,
      value: (data ?? []).map(mapTargetAllocation),
    };
  }

  /**
   * 目标配置写入：必须走 RPC；禁止对 target_allocations 逐行 CRUD。
   * §4.5 未落地时返回 rpc_unavailable。
   */
  async replaceTargetAllocationConfig(params: {
    cashTargetWeight: number;
    allocations: Array<{
      instrumentId: string;
      targetWeight: number;
      allocationRole: TargetAllocation['allocationRole'];
    }>;
  }): Promise<RepoResult<{ cashTargetWeight: number; allocations: TargetAllocation[] }>> {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }
    for (const row of params.allocations) {
      try {
        assertBusinessInstrumentId(row.instrumentId);
      } catch (error) {
        return fail(
          'validation',
          error instanceof Error ? error.message : 'instrumentId 无效'
        );
      }
    }

    const { error } = await this.client.rpc(
      'replace_target_allocation_config',
      {
        p_cash_target_weight: params.cashTargetWeight,
        p_allocations: params.allocations.map(row => ({
          instrument_id: row.instrumentId,
          target_weight: row.targetWeight,
          allocation_role: row.allocationRole,
        })),
      }
    );
    if (error) {
      return fromQueryError(error);
    }

    const listed = await this.listTargetAllocations();
    if (!listed.ok) {
      return listed;
    }
    return {
      ok: true,
      value: {
        // RPC 成功后以入参为准回显；实际权重以 list 结果为准
        cashTargetWeight: params.cashTargetWeight,
        allocations: listed.value,
      },
    };
  }

  async listCustomInstruments(): Promise<RepoResult<ETFInstrument[]>> {
    const { data, error } = await this.client
      .from('etf_instruments')
      .select('*')
      .order('symbol');
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: (data ?? []).map(mapEtfInstrument) };
  }

  async upsertCustomInstrument(
    instrument: Omit<ETFInstrument, 'id' | 'source'> & { id?: string }
  ): Promise<RepoResult<ETFInstrument>> {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }
    assertBusinessInstrumentId(instrument.symbol);
    const payload = {
      ...(instrument.id ? { id: instrument.id } : {}),
      user_id: user.value.id,
      symbol: instrument.symbol,
      name: instrument.name,
      market: instrument.market,
      currency: instrument.currency,
      asset_class: instrument.assetClass,
      tracking_index: instrument.trackingIndex ?? null,
      benchmark_id: instrument.benchmarkId ?? null,
      expense_ratio: instrument.expenseRatio ?? null,
      distribution_policy: instrument.distributionPolicy ?? null,
      liquidity_tag: instrument.liquidityTag ?? null,
      valuation_tag: instrument.valuationTag ?? null,
      default_allocation_role: instrument.defaultAllocationRole ?? null,
      grid_eligible: instrument.gridEligible,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.client
      .from('etf_instruments')
      .upsert(payload, { onConflict: 'user_id,symbol' })
      .select('*')
      .single();
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: mapEtfInstrument(data) };
  }

  async listPositions(asOfDate?: string): Promise<RepoResult<Position[]>> {
    let query = this.client.from('positions').select('*').order('instrument_id');
    if (asOfDate) {
      query = query.eq('as_of_date', asOfDate);
    }
    const { data, error } = await query;
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: (data ?? []).map(mapPosition) };
  }

  async upsertPosition(position: Position): Promise<RepoResult<Position>> {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }
    assertBusinessInstrumentId(position.instrumentId);
    let payload: Record<string, unknown>;
    try {
      payload = { ...toPositionWrite(position), user_id: user.value.id };
    } catch (error) {
      return fail(
        'validation',
        error instanceof Error ? error.message : '持仓校验失败'
      );
    }
    if (position.id) {
      payload.id = position.id;
    }
    const { data, error } = await this.client
      .from('positions')
      // §4.5 落地后唯一键为 (user_id, instrument_id, as_of_date)；当前库若无此约束会报错而非静默改语义
      .upsert(payload, { onConflict: 'user_id,instrument_id,as_of_date' })
      .select('*')
      .single();
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: mapPosition(data) };
  }

  async listTrades(): Promise<RepoResult<TradeRecord[]>> {
    const { data, error } = await this.client
      .from('trade_records')
      .select('*')
      .order('trade_date', { ascending: true });
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: (data ?? []).map(mapTrade) };
  }

  async insertTrade(
    trade: Omit<TradeRecord, 'id'> & { id?: string }
  ): Promise<RepoResult<TradeRecord>> {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }
    assertBusinessInstrumentId(trade.instrumentId);
    const { data, error } = await this.client
      .from('trade_records')
      .insert({ ...toTradeWrite(trade), user_id: user.value.id })
      .select('*')
      .single();
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: mapTrade(data) };
  }

  async listCashFlows(): Promise<RepoResult<CashFlow[]>> {
    const { data, error } = await this.client
      .from('cash_flows')
      .select('*')
      .order('flow_date', { ascending: true });
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: (data ?? []).map(mapCashFlow) };
  }

  async insertCashFlow(
    flow: Omit<CashFlow, 'id'> & { id?: string }
  ): Promise<RepoResult<CashFlow>> {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }
    if (!(flow.amount > 0) || !(flow.amountBase > 0)) {
      return fail('validation', '现金流金额必须为正');
    }
    const { data, error } = await this.client
      .from('cash_flows')
      .insert({ ...toCashFlowWrite(flow), user_id: user.value.id })
      .select('*')
      .single();
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: mapCashFlow(data) };
  }

  async listCashAccounts(asOfDate?: string): Promise<RepoResult<CashAccount[]>> {
    let query = this.client.from('cash_accounts').select('*').order('currency');
    if (asOfDate) {
      query = query.eq('as_of_date', asOfDate);
    }
    const { data, error } = await query;
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: (data ?? []).map(mapCashAccount) };
  }

  async upsertCashAccount(account: CashAccount): Promise<RepoResult<CashAccount>> {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }
    const payload = {
      ...(account.id ? { id: account.id } : {}),
      user_id: user.value.id,
      currency: account.currency,
      as_of_date: account.asOfDate,
      balance: account.balance,
      fx_rate_to_base: account.fxRateToBase,
      balance_base: account.balanceBase,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.client
      .from('cash_accounts')
      .upsert(payload, { onConflict: 'user_id,currency,as_of_date' })
      .select('*')
      .single();
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: mapCashAccount(data) };
  }

  async listRebalancePlans(): Promise<RepoResult<RebalancePlan[]>> {
    const { data, error } = await this.client
      .from('rebalance_plans')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: (data ?? []).map(mapRebalancePlan) };
  }

  async insertRebalancePlan(
    plan: Omit<RebalancePlan, 'id'> & { id?: string }
  ): Promise<RepoResult<RebalancePlan>> {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }
    const payload = {
      ...(plan.id ? { id: plan.id } : {}),
      user_id: user.value.id,
      status: plan.status,
      reason: plan.reason,
      trigger_reason: plan.triggerReason,
      target_weights: plan.targetWeights,
      planned_trades: plan.plannedTrades,
      // cash_target_weight 列待 §4.5；当前库无此列，禁止写入以免未知列报错
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.client
      .from('rebalance_plans')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: mapRebalancePlan(data) };
  }

  async listGridPlans(): Promise<RepoResult<GridPlanSnapshot[]>> {
    const { data, error } = await this.client
      .from('grid_plans')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: (data ?? []).map(mapGridPlan) };
  }

  async insertGridPlan(
    plan: Omit<GridPlanSnapshot, 'id'> & { id?: string }
  ): Promise<RepoResult<GridPlanSnapshot>> {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }
    assertBusinessInstrumentId(plan.instrumentId);
    const payload = {
      ...(plan.id ? { id: plan.id } : {}),
      user_id: user.value.id,
      instrument_id: plan.instrumentId,
      status: plan.status,
      params: plan.params,
      legs: plan.legs,
      aggregated_rows: plan.aggregatedRows,
      total_budget: plan.totalBudget,
      remaining_budget: plan.remainingBudget,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.client
      .from('grid_plans')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: mapGridPlan(data) };
  }

  async listDecisionLogs(): Promise<RepoResult<DecisionLog[]>> {
    const { data, error } = await this.client
      .from('decision_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: (data ?? []).map(mapDecisionLog) };
  }

  async insertDecisionLog(
    log: Omit<DecisionLog, 'id'> & { id?: string }
  ): Promise<RepoResult<DecisionLog>> {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }
    const payload = {
      ...(log.id ? { id: log.id } : {}),
      user_id: user.value.id,
      title: log.title,
      hypothesis: log.hypothesis,
      validation_condition: log.validationCondition,
      invalid_condition: log.invalidCondition,
      review_date: log.reviewDate,
      status: log.status,
      linked_instrument_id: log.linkedInstrumentId ?? null,
      linked_trade_id: log.linkedTradeId ?? null,
      linked_rebalance_plan_id: log.linkedRebalancePlanId ?? null,
      linked_grid_plan_id: log.linkedGridPlanId ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.client
      .from('decision_logs')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: mapDecisionLog(data) };
  }

  async listReviewEntries(): Promise<RepoResult<ReviewEntry[]>> {
    const { data, error } = await this.client
      .from('review_entries')
      .select('*')
      .order('period_end', { ascending: false });
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: (data ?? []).map(mapReviewEntry) };
  }

  async insertReviewEntry(
    entry: Omit<ReviewEntry, 'id'> & { id?: string }
  ): Promise<RepoResult<ReviewEntry>> {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }
    const payload = {
      ...(entry.id ? { id: entry.id } : {}),
      user_id: user.value.id,
      period_start: entry.periodStart,
      period_end: entry.periodEnd,
      report_markdown: entry.reportMarkdown,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.client
      .from('review_entries')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: mapReviewEntry(data) };
  }

  async listPortfolioSnapshots(): Promise<RepoResult<PortfolioSnapshot[]>> {
    const { data, error } = await this.client
      .from('portfolio_snapshots')
      .select('*')
      .order('as_of_date', { ascending: true });
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: (data ?? []).map(mapPortfolioSnapshot) };
  }

  /**
   * CSV 整批导入：必须走受 RLS 保护的导入 RPC；禁止浏览器逐行 insert 冒充事务。
   * §4.5 未就绪时明确失败。调用前先做费税去重。
   */
  async importLedgerBatch(params: {
    sourceFileName: string;
    sourceFileHash: string;
    trades: TradeRecord[];
    cashFlows: CashFlow[];
    positions?: Position[];
  }): Promise<
    RepoResult<{
      importBatchId: string;
      discardedFeeFlowIds: string[];
      suspectedDuplicateFlowIds: string[];
      issues: string[];
    }>
  > {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }

    const deduped = dedupeFeeTaxCashFlows({
      trades: params.trades,
      cashFlows: params.cashFlows,
    });

    let positionRows: Record<string, unknown>[] = [];
    try {
      positionRows = (params.positions ?? []).map(position =>
        toPositionWrite(position)
      );
    } catch (error) {
      return fail(
        'validation',
        error instanceof Error ? error.message : '持仓校验失败'
      );
    }

    const { data, error } = await this.client.rpc('import_ledger_batch', {
      p_source_file_name: params.sourceFileName,
      p_source_file_hash: params.sourceFileHash,
      p_trades: params.trades.map(toTradeWrite),
      p_cash_flows: deduped.cashFlows.map(toCashFlowWrite),
      p_positions: positionRows,
    });

    if (error) {
      return fromQueryError(error);
    }
    const importBatchId =
      typeof data === 'string'
        ? data
        : (data as { import_batch_id?: string } | null)?.import_batch_id;
    if (!importBatchId) {
      return fail(
        'rpc_unavailable',
        'import_ledger_batch 未返回 import_batch_id（§4.5 未就绪）'
      );
    }
    return {
      ok: true,
      value: {
        importBatchId,
        discardedFeeFlowIds: deduped.discarded.map(flow => flow.id),
        suspectedDuplicateFlowIds: deduped.suspectedDuplicates.map(
          flow => flow.id
        ),
        issues: deduped.issues.map(issue => issue.message),
      },
    };
  }

  async rollbackImportBatch(
    importBatchId: string
  ): Promise<RepoResult<{ rolledBack: true }>> {
    const user = await this.requireUser();
    if (!user.ok) {
      return user;
    }
    const { error } = await this.client.rpc('rollback_import_batch', {
      p_import_batch_id: importBatchId,
    });
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: { rolledBack: true } };
  }

  /** 共享行情只读：禁止 upsert/delete */
  async listFxRates(params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<RepoResult<FxRate[]>> {
    let query = this.client
      .from('fx_rates')
      .select('rate_date,from_currency,to_currency,rate')
      .order('rate_date', { ascending: true });
    if (params?.fromDate) {
      query = query.gte('rate_date', params.fromDate);
    }
    if (params?.toDate) {
      query = query.lte('rate_date', params.toDate);
    }
    const { data, error } = await query;
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: (data ?? []).map(mapFxRate) };
  }

  async listPriceBars(params: {
    instrumentId: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<RepoResult<PriceBar[]>> {
    assertBusinessInstrumentId(params.instrumentId);
    const shortCode = etfDailyLookupCode(params.instrumentId);
    let query = this.client
      .from('etf_daily')
      .select(
        'etf_code,trade_date,open,high,low,close,open_qfq,high_qfq,low_qfq,close_qfq,volume'
      )
      .eq('etf_code', shortCode)
      .order('trade_date', { ascending: true });
    if (params.fromDate) {
      query = query.gte('trade_date', params.fromDate);
    }
    if (params.toDate) {
      query = query.lte('trade_date', params.toDate);
    }
    const { data, error } = await query;
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: (data ?? []).map(mapPriceBar) };
  }

  async listSharedPoolInstruments(): Promise<RepoResult<ETFInstrument[]>> {
    const { data, error } = await this.client
      .from('etf_pool_snapshots')
      .select(
        'etf_code,etf_name,category,tracking_index_code,expense_ratio'
      );
    if (error) {
      return fromQueryError(error);
    }
    return {
      ok: true,
      value: (data ?? []).map(mapSharedPoolInstrument),
    };
  }

  async listIndices(): Promise<
    RepoResult<Array<{ code: string; name: string; category: string | null }>>
  > {
    const { data, error } = await this.client
      .from('indices')
      .select('code,name,category')
      .order('display_order', { ascending: true });
    if (error) {
      return fromQueryError(error);
    }
    return { ok: true, value: data ?? [] };
  }

  async listIndexDailyPrices(params: {
    indexCode: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<
    RepoResult<Array<{ indexCode: string; date: string; close: number }>>
  > {
    let query = this.client
      .from('index_daily_prices')
      .select('index_code,trade_date,close')
      .eq('index_code', params.indexCode)
      .order('trade_date', { ascending: true });
    if (params.fromDate) {
      query = query.gte('trade_date', params.fromDate);
    }
    if (params.toDate) {
      query = query.lte('trade_date', params.toDate);
    }
    const { data, error } = await query;
    if (error) {
      return fromQueryError(error);
    }
    return {
      ok: true,
      value: (data ?? []).map(row => ({
        indexCode: row.index_code as string,
        date: row.trade_date as string,
        close: Number(row.close),
      })),
    };
  }

  /** 显式拒绝共享表写入，防止误用 */
  forbidSharedMarketWrite(): RepoResult<never> {
    return fail(
      'forbidden_shared_write',
      '禁止对本仓写入 etf_daily / fx_rates 等共享行情表'
    );
  }
}
