import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FamilyLedgerItem,
  FamilyAssetHistoryRow,
  FamilyMember,
  FamilyMemberRole,
  FourPot,
  InsurancePolicy,
  LedgerCategory,
  LedgerSide,
  PolicyStatus,
  PolicyType,
} from '@/types/family-finance';
import { parseMoney } from '@/lib/family-finance/aggregates';

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
}
