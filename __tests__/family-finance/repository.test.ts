import type { SupabaseClient } from '@supabase/supabase-js';
import { FamilyFinanceRepository } from '@/lib/supabase/family-finance-repository';

function createPolicyClient() {
  const row = {
    id: 'policy-1',
    user_id: 'user-1',
    member_id: 'member-1',
    policy_type: 'life',
    insurer: null,
    name: '寿险',
    coverage_amount: '1000000.00',
    annual_premium: '8000.00',
    status: 'active',
    start_date: '2024-01-01',
    end_date: '2044-01-01',
    note: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2026-07-22T00:00:00Z',
  };
  const single = jest.fn().mockResolvedValue({ data: row, error: null });
  const select = jest.fn(() => ({ single }));
  const eq = jest.fn(() => ({ select }));
  const update = jest.fn(() => ({ eq }));
  const insert = jest.fn(() => ({ select }));
  const client = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: jest.fn(() => ({ update, insert })),
  } as unknown as SupabaseClient;

  return { client, update, insert };
}

const policyInput = {
  memberId: 'member-1',
  policyType: 'life' as const,
  name: '寿险',
  coverageAmount: 1_000_000,
  annualPremium: 8_000,
  status: 'active' as const,
};

describe('FamilyFinanceRepository policies', () => {
  it('更新时不覆盖未提供的起止日期', async () => {
    const { client, update } = createPolicyClient();
    const repo = new FamilyFinanceRepository(client);

    await repo.upsertPolicy({ id: 'policy-1', ...policyInput });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).not.toHaveProperty('start_date');
    expect(update.mock.calls[0][0]).not.toHaveProperty('end_date');
  });

  it('新建时将未提供的起止日期写为 null', async () => {
    const { client, insert } = createPolicyClient();
    const repo = new FamilyFinanceRepository(client);

    await repo.upsertPolicy(policyInput);

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      start_date: null,
      end_date: null,
    });
  });
});
