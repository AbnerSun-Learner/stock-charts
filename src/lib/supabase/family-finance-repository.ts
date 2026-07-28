import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FamilyLedgerItem,
  FamilyAssetHistoryRow,
  FamilyBalanceSnapshot,
  FamilyMember,
  FamilyMemberRole,
  FamilyMentalAccount,
  FourPot,
  InsurancePolicy,
  LedgerCategory,
  LedgerSide,
  MentalAccountPriority,
  PolicyStatus,
  PolicyType,
} from '@/types/family-finance';
import { parseMoney } from '@/lib/family-finance/aggregates';
import { computeLedgerTransfer } from '@/lib/family-finance/ledger-transfer';
import {
  assertMentalAccountDateRange,
  isValidMentalAccountPriority,
} from '@/lib/family-finance/mental-account';

function mapMember(row: Record<string, unknown>): FamilyMember {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    role: row.role as FamilyMemberRole,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapLedgerItem(row: Record<string, unknown>): FamilyLedgerItem {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    memberId: row.member_id ? String(row.member_id) : null,
    side: row.side as LedgerSide,
    category: row.category as LedgerCategory,
    name: String(row.name),
    amount: parseMoney(row.amount as string | number),
    currency: 'CNY',
    fourPot: (row.four_pot as FourPot | null) ?? null,
    note: row.note ? String(row.note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPolicy(row: Record<string, unknown>): InsurancePolicy {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    memberId: String(row.member_id),
    policyType: row.policy_type as PolicyType,
    insurer: row.insurer ? String(row.insurer) : null,
    name: String(row.name),
    coverageAmount: parseMoney(row.coverage_amount as string | number),
    annualPremium: parseMoney(row.annual_premium as string | number),
    status: row.status as PolicyStatus,
    startDate: row.start_date ? String(row.start_date) : null,
    endDate: row.end_date ? String(row.end_date) : null,
    note: row.note ? String(row.note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/** 同页并发（如 React Strict Mode 双挂载）合并为一次 ensureSelf。 */
const ensureSelfInflight = new Map<string, Promise<FamilyMember>>();

/**
 * 家庭财务 Supabase Repository（活账 + 每日历史 + 成员 + 保单）。
 */
export class FamilyFinanceRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async requireUserId(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new Error('未登录');
    return data.user.id;
  }

  /** 幂等确保存在 role=self 的成员。 */
  async ensureSelfMember(defaultName = '我'): Promise<FamilyMember> {
    const userId = await this.requireUserId();
    const inflight = ensureSelfInflight.get(userId);
    if (inflight) return inflight;

    const promise = this.ensureSelfMemberOnce(userId, defaultName).finally(() => {
      ensureSelfInflight.delete(userId);
    });
    ensureSelfInflight.set(userId, promise);
    return promise;
  }

  private async ensureSelfMemberOnce(
    userId: string,
    defaultName: string
  ): Promise<FamilyMember> {
    const { data: existing, error: listError } = await this.client
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .eq('role', 'self')
      .order('created_at', { ascending: true })
      .limit(1);

    if (listError) throw new Error(listError.message);
    if (existing && existing.length > 0) return mapMember(existing[0]);

    const { data, error } = await this.client
      .from('family_members')
      .insert({
        user_id: userId,
        name: defaultName,
        role: 'self',
        sort_order: 0,
      })
      .select('*')
      .single();

    // 唯一索引冲突：另一并发请求已插入，回读即可
    if (error) {
      if (error.code === '23505') {
        const { data: raced, error: racedError } = await this.client
          .from('family_members')
          .select('*')
          .eq('user_id', userId)
          .eq('role', 'self')
          .order('created_at', { ascending: true })
          .limit(1);
        if (racedError) throw new Error(racedError.message);
        if (raced && raced.length > 0) return mapMember(raced[0]);
      }
      throw new Error(error.message);
    }
    return mapMember(data);
  }

  async listMembers(): Promise<FamilyMember[]> {
    const { data, error } = await this.client
      .from('family_members')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMember);
  }

  async createMember(input: {
    name: string;
    role: Exclude<FamilyMemberRole, 'self'>;
  }): Promise<FamilyMember> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('family_members')
      .insert({
        user_id: userId,
        name: input.name.trim(),
        role: input.role,
        sort_order: 10,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapMember(data);
  }

  async renameMember(id: string, name: string): Promise<FamilyMember> {
    const { data, error } = await this.client
      .from('family_members')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapMember(data);
  }

  async deleteMember(id: string): Promise<void> {
    const { error } = await this.client.from('family_members').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') {
        throw new Error('仍有资产条目/保单引用该成员，请先改挂或删除相关记录');
      }
      throw new Error(error.message);
    }
  }

  async listLedgerItems(): Promise<FamilyLedgerItem[]> {
    const { data, error } = await this.client
      .from('family_ledger_items')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapLedgerItem);
  }

  /** 读取家庭日汇总快照（总资产 / 总负债 / 净资产）。 */
  async listBalanceSnapshots(): Promise<FamilyBalanceSnapshot[]> {
    const { data, error } = await this.client
      .from('family_snapshots')
      .select('as_of_date,total_assets,total_liabilities,net_worth')
      .order('as_of_date', { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? []).map(row => ({
      date: String(row.as_of_date),
      totalAssets: parseMoney(row.total_assets as string | number),
      totalLiabilities: parseMoney(row.total_liabilities as string | number),
      netWorth: parseMoney(row.net_worth as string | number),
    }));
  }

  /** 读取每位成员按活钱 / 稳钱 / 长钱聚合的每日历史。 */
  async listAssetHistory(): Promise<FamilyAssetHistoryRow[]> {
    const { data, error } = await this.client
      .from('family_asset_history')
      .select(
        'as_of_date,member_id,member_name,sort_order,four_pot,pot_order,total_assets'
      )
      .order('as_of_date', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('pot_order', { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? []).map(row => ({
      date: String(row.as_of_date),
      memberId: String(row.member_id),
      memberName: String(row.member_name),
      sortOrder: Number(row.sort_order ?? 0),
      fourPot: row.four_pot as FamilyAssetHistoryRow['fourPot'],
      potOrder: Number(row.pot_order ?? 0),
      totalAssets: parseMoney(row.total_assets as string | number),
    }));
  }

  async upsertLedgerItem(input: {
    id?: string;
    side: LedgerSide;
    category: LedgerCategory;
    name: string;
    amount: number;
    memberId: string | null;
    fourPot?: FourPot | null;
    note?: string | null;
  }): Promise<FamilyLedgerItem> {
    const userId = await this.requireUserId();
    if (input.side === 'asset' && !input.memberId) {
      throw new Error('资产条目必须选择成员');
    }
    if (input.side === 'liability' && input.memberId) {
      throw new Error('负债条目不归属成员');
    }

    const payload = {
      user_id: userId,
      side: input.side,
      category: input.category,
      name: input.name.trim(),
      amount: parseMoney(input.amount),
      currency: 'CNY',
      member_id: input.side === 'asset' ? input.memberId : null,
      // 四笔钱仅用于资产标签；负债强制清空
      four_pot: input.side === 'asset' ? (input.fourPot ?? null) : null,
      note: input.note ?? null,
      updated_at: new Date().toISOString(),
    };

    if (input.id) {
      const { data, error } = await this.client
        .from('family_ledger_items')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapLedgerItem(data);
    }

    const { data, error } = await this.client
      .from('family_ledger_items')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapLedgerItem(data);
  }

  async deleteLedgerItem(id: string): Promise<void> {
    const { error } = await this.client.from('family_ledger_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  /**
   * 将源资产金额转移到目标资产；源余额可为 0，不删除条目。
   * 目标更新失败时会尝试把源金额回滚，避免钱凭空消失。
   */
  async transferLedgerAmount(input: {
    fromId: string;
    toId: string;
    amount: number;
  }): Promise<{ source: FamilyLedgerItem; target: FamilyLedgerItem }> {
    if (input.fromId === input.toId) {
      throw new Error('不能转移到自身');
    }
    await this.requireUserId();

    const { data, error } = await this.client
      .from('family_ledger_items')
      .select('*')
      .in('id', [input.fromId, input.toId]);
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map(mapLedgerItem);
    const source = rows.find(r => r.id === input.fromId);
    const target = rows.find(r => r.id === input.toId);
    if (!source || !target) {
      throw new Error('转移条目不存在');
    }
    if (source.side !== 'asset' || target.side !== 'asset') {
      throw new Error('仅支持资产条目之间转移');
    }

    const { sourceAfter, targetAfter } = computeLedgerTransfer({
      sourceAmount: source.amount,
      targetAmount: target.amount,
      transferAmount: input.amount,
    });

    const updatedAt = new Date().toISOString();
    const { data: sourceRow, error: sourceError } = await this.client
      .from('family_ledger_items')
      .update({ amount: sourceAfter, updated_at: updatedAt })
      .eq('id', input.fromId)
      .eq('amount', source.amount)
      .select('*')
      .maybeSingle();
    if (sourceError) throw new Error(sourceError.message);
    if (!sourceRow) {
      throw new Error('源条目余额已变更，请关闭后重新打开再转移');
    }

    const { data: targetRow, error: targetError } = await this.client
      .from('family_ledger_items')
      .update({ amount: targetAfter, updated_at: updatedAt })
      .eq('id', input.toId)
      .eq('amount', target.amount)
      .select('*')
      .maybeSingle();
    if (targetError || !targetRow) {
      const { data: rolledBack, error: rollbackError } = await this.client
        .from('family_ledger_items')
        .update({ amount: source.amount, updated_at: new Date().toISOString() })
        .eq('id', input.fromId)
        .eq('amount', sourceAfter)
        .select('*')
        .maybeSingle();
      if (rollbackError || !rolledBack) {
        throw new Error(
          `目标更新失败且源回滚未确认，请核对两侧余额（${targetError?.message ?? '目标余额已变更'}；回滚：${rollbackError?.message ?? '未匹配到可回滚行'}）`
        );
      }
      throw new Error(
        targetError?.message ?? '目标条目余额已变更，源金额已回滚，请重试'
      );
    }

    return {
      source: mapLedgerItem(sourceRow),
      target: mapLedgerItem(targetRow),
    };
  }

  async listPolicies(): Promise<InsurancePolicy[]> {
    const { data, error } = await this.client
      .from('insurance_policies')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapPolicy);
  }

  async upsertPolicy(input: {
    id?: string;
    memberId: string;
    policyType: PolicyType;
    name: string;
    insurer?: string | null;
    coverageAmount: number;
    annualPremium: number;
    status: PolicyStatus;
    startDate?: string | null;
    endDate?: string | null;
    note?: string | null;
  }): Promise<InsurancePolicy> {
    const userId = await this.requireUserId();
    const payload: Record<string, unknown> = {
      user_id: userId,
      member_id: input.memberId,
      policy_type: input.policyType,
      name: input.name.trim(),
      insurer: input.insurer ?? null,
      coverage_amount: parseMoney(input.coverageAmount),
      annual_premium: parseMoney(input.annualPremium),
      status: input.status,
      note: input.note ?? null,
      updated_at: new Date().toISOString(),
    };

    // 新建时补齐 nullable 列；更新时只覆盖调用方明确提供的日期，
    // 避免不展示日期的编辑界面悄然清空历史数据。
    if (!input.id || input.startDate !== undefined) {
      payload.start_date = input.startDate || null;
    }
    if (!input.id || input.endDate !== undefined) {
      payload.end_date = input.endDate || null;
    }

    if (input.id) {
      const { data, error } = await this.client
        .from('insurance_policies')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapPolicy(data);
    }

    const { data, error } = await this.client
      .from('insurance_policies')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapPolicy(data);
  }

  async deletePolicy(id: string): Promise<void> {
    const { error } = await this.client.from('insurance_policies').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  /** 列出心理账户（含关联活账 id）。 */
  async listMentalAccounts(): Promise<FamilyMentalAccount[]> {
    const { data: accounts, error } = await this.client
      .from('family_mental_accounts')
      .select('*')
      .order('priority', { ascending: true })
      .order('target_date', { ascending: true });
    if (error) throw new Error(error.message);

    const { data: links, error: linkError } = await this.client
      .from('family_mental_account_links')
      .select('mental_account_id, ledger_item_id');
    if (linkError) throw new Error(linkError.message);

    const idsByAccount = new Map<string, string[]>();
    for (const row of links ?? []) {
      const accountId = String(row.mental_account_id);
      const list = idsByAccount.get(accountId) ?? [];
      list.push(String(row.ledger_item_id));
      idsByAccount.set(accountId, list);
    }

    return (accounts ?? []).map(row => {
      const priority = String(row.priority);
      if (!isValidMentalAccountPriority(priority)) {
        throw new Error(`心理账户优先级非法: ${priority}`);
      }
      return {
        id: String(row.id),
        userId: String(row.user_id),
        name: String(row.name),
        targetAmount: parseMoney(row.target_amount as string | number),
        priority,
        startDate: String(row.start_date).slice(0, 10),
        targetDate: String(row.target_date).slice(0, 10),
        ledgerItemIds: idsByAccount.get(String(row.id)) ?? [],
        showLinkedAccounts: row.show_linked_accounts !== false,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
    });
  }

  /**
   * 创建或更新心理账户，并差量同步关联账目（活钱 / 稳钱 / 长钱）。
   * 新建若 links 失败会回滚删除账户，避免孤儿记录。
   */
  async upsertMentalAccount(input: {
    id?: string;
    name: string;
    targetAmount: number;
    priority: MentalAccountPriority;
    startDate: string;
    targetDate: string;
    ledgerItemIds: string[];
    showLinkedAccounts: boolean;
  }): Promise<FamilyMentalAccount> {
    const userId = await this.requireUserId();
    const name = input.name.trim();
    if (!name || name.length > 32) {
      throw new Error('名称必填且不超过 32 字');
    }
    if (!(input.targetAmount > 0)) {
      throw new Error('预期目标必须大于 0');
    }
    if (!isValidMentalAccountPriority(input.priority)) {
      throw new Error('请选择优先级');
    }
    assertMentalAccountDateRange(input.startDate, input.targetDate);
    if (input.ledgerItemIds.length === 0) {
      throw new Error('请至少关联一笔账目');
    }

    const uniqueIds = Array.from(new Set(input.ledgerItemIds));
    await this.assertStructurePotExclusiveIds(uniqueIds, input.id);

    const isCreate = !input.id;
    const accountId = await this.saveMentalAccountRow({
      id: input.id,
      userId,
      name,
      targetAmount: input.targetAmount,
      priority: input.priority,
      startDate: input.startDate,
      targetDate: input.targetDate,
      showLinkedAccounts: input.showLinkedAccounts,
    });

    try {
      await this.syncMentalAccountLinks(accountId, userId, uniqueIds);
    } catch (e) {
      if (isCreate) {
        await this.client.from('family_mental_accounts').delete().eq('id', accountId);
      }
      throw e;
    }

    const accounts = await this.listMentalAccounts();
    const saved = accounts.find(a => a.id === accountId);
    if (!saved) throw new Error('保存后读取心理账户失败');
    return saved;
  }

  /** 校验关联账目均为活钱/稳钱/长钱，且未被其他心理账户占用。 */
  private async assertStructurePotExclusiveIds(
    uniqueIds: string[],
    editingAccountId: string | undefined
  ): Promise<void> {
    const { data: ledgerRows, error: ledgerError } = await this.client
      .from('family_ledger_items')
      .select('id, side, four_pot')
      .in('id', uniqueIds);
    if (ledgerError) throw new Error(ledgerError.message);
    if ((ledgerRows ?? []).length !== uniqueIds.length) {
      throw new Error('部分关联账目不存在');
    }
    for (const row of ledgerRows ?? []) {
      const pot = row.four_pot as string | null;
      if (
        row.side !== 'asset' ||
        (pot !== 'liquid' && pot !== 'stable' && pot !== 'long_term')
      ) {
        throw new Error('只能关联标注为活钱、稳钱或长钱的资产账目');
      }
    }

    const { data: occupiedLinks, error: occupiedError } = await this.client
      .from('family_mental_account_links')
      .select('ledger_item_id, mental_account_id')
      .in('ledger_item_id', uniqueIds);
    if (occupiedError) throw new Error(occupiedError.message);
    for (const link of occupiedLinks ?? []) {
      if (editingAccountId && String(link.mental_account_id) === editingAccountId) continue;
      throw new Error('部分账目已被其他心理账户关联');
    }
  }

  /** 写入心理账户主表，返回 id。 */
  private async saveMentalAccountRow(input: {
    id?: string;
    userId: string;
    name: string;
    targetAmount: number;
    priority: MentalAccountPriority;
    startDate: string;
    targetDate: string;
    showLinkedAccounts: boolean;
  }): Promise<string> {
    const payload = {
      user_id: input.userId,
      name: input.name,
      target_amount: parseMoney(input.targetAmount),
      priority: input.priority,
      start_date: input.startDate,
      target_date: input.targetDate,
      show_linked_accounts: input.showLinkedAccounts,
      updated_at: new Date().toISOString(),
    };

    if (input.id) {
      const { data, error } = await this.client
        .from('family_mental_accounts')
        .update(payload)
        .eq('id', input.id)
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return String(data.id);
    }

    const { data, error } = await this.client
      .from('family_mental_accounts')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return String(data.id);
  }

  /** 差量同步关联：只删移除项、只插新增项。 */
  private async syncMentalAccountLinks(
    accountId: string,
    userId: string,
    nextIds: string[]
  ): Promise<void> {
    const { data: existing, error: listError } = await this.client
      .from('family_mental_account_links')
      .select('ledger_item_id')
      .eq('mental_account_id', accountId);
    if (listError) throw new Error(listError.message);

    const current = new Set((existing ?? []).map(r => String(r.ledger_item_id)));
    const desired = new Set(nextIds);
    const toRemove = Array.from(current).filter(id => !desired.has(id));
    const toAdd = Array.from(desired).filter(id => !current.has(id));

    if (toRemove.length > 0) {
      const { error } = await this.client
        .from('family_mental_account_links')
        .delete()
        .eq('mental_account_id', accountId)
        .in('ledger_item_id', toRemove);
      if (error) throw new Error(error.message);
    }

    if (toAdd.length > 0) {
      const { error } = await this.client.from('family_mental_account_links').insert(
        toAdd.map(ledgerItemId => ({
          mental_account_id: accountId,
          ledger_item_id: ledgerItemId,
          user_id: userId,
        }))
      );
      if (error) {
        if (error.code === '23505') {
          throw new Error('部分账目已被其他心理账户关联');
        }
        throw new Error(error.message);
      }
    }
  }

  async deleteMentalAccount(id: string): Promise<void> {
    const { error } = await this.client.from('family_mental_accounts').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
