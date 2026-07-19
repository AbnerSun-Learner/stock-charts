import type { SupabaseClient } from '@supabase/supabase-js';
import { IndexMarketRepository } from '@/lib/supabase/index-market-repository';

describe('IndexMarketRepository.getIndexMetrics', () => {
  it('按 1000 行分页，直到最后一页', async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({
      index_code: '000300.SH',
      trade_date: `day-${String(index).padStart(4, '0')}`,
      close: index + 1,
      pe_ttm: null,
      pb: null,
    }));
    const range = jest
      .fn()
      .mockResolvedValueOnce({ data: rows.slice(0, 1000), error: null })
      .mockResolvedValueOnce({ data: rows.slice(1000), error: null });
    const builder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range,
    };
    const client = { from: jest.fn(() => builder) } as unknown as SupabaseClient;

    const result = await new IndexMarketRepository(client).getIndexMetrics('000300.SH');

    expect(result).toHaveLength(1001);
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
});
