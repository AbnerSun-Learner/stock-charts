import { InvestmentRepository } from '@/lib/supabase/investment-repository';
import { AUTH_DISABLED } from '@/lib/supabase/auth-flags';
import type { SupabaseClient } from '@supabase/supabase-js';

type MockQuery = {
  select: jest.Mock;
  insert: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  order: jest.Mock;
  maybeSingle: jest.Mock;
  single: jest.Mock;
};

function createThenableQuery(result: { data: unknown; error: unknown }): MockQuery {
  const query: MockQuery = {
    select: jest.fn(),
    insert: jest.fn(),
    upsert: jest.fn(),
    eq: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    order: jest.fn(),
    maybeSingle: jest.fn(),
    single: jest.fn(),
  };
  const chain = () => query;
  query.select.mockImplementation(chain);
  query.insert.mockImplementation(chain);
  query.upsert.mockImplementation(chain);
  query.eq.mockImplementation(chain);
  query.gte.mockImplementation(chain);
  query.lte.mockImplementation(chain);
  query.order.mockImplementation(chain);
  query.maybeSingle.mockResolvedValue(result);
  query.single.mockResolvedValue(result);
  // 支持 await query（list 场景）
  (query as unknown as { then: typeof Promise.prototype.then }).then = (
    onFulfilled,
    onRejected
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return query;
}

describe('InvestmentRepository', () => {
  it('无会话时拒绝写入', async () => {
    if (AUTH_DISABLED) {
      // 审阅期关闭鉴权；恢复 AUTH_DISABLED=false 后本用例重新生效
      expect(AUTH_DISABLED).toBe(true);
      return;
    }

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: jest.fn(),
      rpc: jest.fn(),
    } as unknown as SupabaseClient;

    const repo = new InvestmentRepository(client);
    const result = await repo.insertCashFlow({
      flowDate: '2024-01-02',
      type: 'deposit',
      amount: 100,
      amountBase: 100,
      currency: 'CNY',
      fxRateToBase: 1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toBe('unauthenticated');
  });

  it('读取组合设置成功', async () => {
    const query = createThenableQuery({
      data: {
        id: 's1',
        base_currency: 'CNY',
        benchmark_id: null,
        relative_drift_threshold: 0.2,
        absolute_drift_threshold: 0.05,
        review_cadence_days: 90,
      },
      error: null,
    });
    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'u1' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue(query),
      rpc: jest.fn(),
    } as unknown as SupabaseClient;

    const repo = new InvestmentRepository(client);
    const result = await repo.getPortfolioSettings();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value?.baseCurrency).toBe('CNY');
    expect(result.value?.cashTargetWeight).toBe(0);
  });

  it('目标配置写入在 RPC 缺失时返回 rpc_unavailable', async () => {
    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'u1' } },
          error: null,
        }),
      },
      from: jest.fn(),
      rpc: jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST202',
          message: 'Could not find the function public.replace_target_allocation_config',
        },
      }),
    } as unknown as SupabaseClient;

    const repo = new InvestmentRepository(client);
    const result = await repo.replaceTargetAllocationConfig({
      cashTargetWeight: 0.1,
      allocations: [
        {
          instrumentId: '510300.SH',
          targetWeight: 0.9,
          allocationRole: 'core',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toBe('rpc_unavailable');
  });

  it('批量导入在 RPC 缺失时失败，且不逐行 insert', async () => {
    const from = jest.fn();
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.import_ledger_batch',
      },
    });
    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'u1' } },
          error: null,
        }),
      },
      from,
      rpc,
    } as unknown as SupabaseClient;

    const repo = new InvestmentRepository(client);
    const result = await repo.importLedgerBatch({
      sourceFileName: 'a.csv',
      sourceFileHash: 'hash',
      trades: [],
      cashFlows: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toBe('rpc_unavailable');
    expect(from).not.toHaveBeenCalled();
  });

  it('显式禁止共享行情写入', () => {
    const repo = new InvestmentRepository({} as SupabaseClient);
    const result = repo.forbidSharedMarketWrite();
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toBe('forbidden_shared_write');
  });

  it('只读 fx_rates 映射 rate_date → date', async () => {
    const query = createThenableQuery({
      data: [
        {
          rate_date: '2024-01-02',
          from_currency: 'USD',
          to_currency: 'CNY',
          rate: 7.1,
        },
      ],
      error: null,
    });
    const client = {
      auth: { getUser: jest.fn() },
      from: jest.fn().mockReturnValue(query),
      rpc: jest.fn(),
    } as unknown as SupabaseClient;

    const repo = new InvestmentRepository(client);
    const result = await repo.listFxRates();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value[0]).toEqual({
      date: '2024-01-02',
      fromCurrency: 'USD',
      toCurrency: 'CNY',
      rate: 7.1,
    });
  });
});
