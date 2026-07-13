import { toPortfolioSettingsWrite } from '@/lib/supabase/mappers';

describe('portfolio settings write mapper', () => {
  it('不把 cash_target_weight 写入当前库 payload', () => {
    const payload = toPortfolioSettingsWrite({
      baseCurrency: 'CNY',
      relativeDriftThreshold: 0.2,
      absoluteDriftThreshold: 0.05,
      reviewCadenceDays: 90,
      cashTargetWeight: 0.15,
      cashBaselineDate: '2024-01-01',
    });
    expect(payload).not.toHaveProperty('cash_target_weight');
    expect(payload).not.toHaveProperty('cash_baseline_date');
  });
});
