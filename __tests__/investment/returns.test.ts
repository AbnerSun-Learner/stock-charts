import {
  calculateXirr,
  calculateTwr,
  extractXirrExternalFlows,
  toTwrCashFlowAmount,
  toXirrSignedAmount,
} from '@/lib/investment/returns';
import type { CashFlow, PortfolioSnapshot } from '@/types/investment';

describe('returns / XIRR', () => {
  it('无外部现金流时仅终值 → no_sign_change', () => {
    const result = calculateXirr({
      externalCashFlows: [],
      terminalValueBase: 10000,
      valuationDate: '2024-12-31',
    });
    expect(result).toEqual({ ok: false, error: 'no_sign_change' });
  });

  it('仅入金+终值可收敛', () => {
    const result = calculateXirr({
      externalCashFlows: [{ date: '2024-01-01', amountBase: -10000 }],
      terminalValueBase: 11000,
      valuationDate: '2024-12-31',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toBeGreaterThan(0.09);
    expect(result.value).toBeLessThan(0.12);
  });

  it('多次出入金+终值', () => {
    const result = calculateXirr({
      externalCashFlows: [
        { date: '2024-01-01', amountBase: -10000 },
        { date: '2024-06-01', amountBase: -5000 },
        { date: '2024-09-01', amountBase: 2000 },
      ],
      terminalValueBase: 14000,
      valuationDate: '2024-12-31',
    });
    expect(result.ok).toBe(true);
  });

  it('无正负异号 → no_sign_change', () => {
    const result = calculateXirr({
      externalCashFlows: [
        { date: '2024-01-01', amountBase: -1000 },
        { date: '2024-06-01', amountBase: -500 },
      ],
      terminalValueBase: 0,
      valuationDate: '2024-12-31',
    });
    expect(result).toEqual({ ok: false, error: 'no_sign_change' });
  });

  it('dividend 不计入 XIRR 外部现金流', () => {
    const flows: CashFlow[] = [
      {
        id: '1',
        flowDate: '2024-01-01',
        type: 'deposit',
        amount: 1000,
        amountBase: 1000,
        currency: 'CNY',
        fxRateToBase: 1,
      },
      {
        id: '2',
        flowDate: '2024-06-01',
        type: 'dividend',
        amount: 50,
        amountBase: 50,
        currency: 'CNY',
        fxRateToBase: 1,
      },
    ];
    const external = extractXirrExternalFlows(flows);
    expect(external).toHaveLength(1);
    expect(external[0].amountBase).toBe(-1000);
  });

  it('账本金额非负，符号由 type 转换；XIRR 与 TWR 符号相反', () => {
    expect(toXirrSignedAmount('deposit', 100)).toBe(-100);
    expect(toXirrSignedAmount('withdrawal', 100)).toBe(100);
    expect(toTwrCashFlowAmount('deposit', 100)).toBe(100);
    expect(toTwrCashFlowAmount('withdrawal', 100)).toBe(-100);
  });

  it('终值非法 → invalid_terminal_value', () => {
    expect(
      calculateXirr({
        externalCashFlows: [{ date: '2024-01-01', amountBase: -1 }],
        terminalValueBase: Number.NaN,
        valuationDate: '2024-12-31',
      })
    ).toEqual({ ok: false, error: 'invalid_terminal_value' });
  });
});

describe('returns / TWR', () => {
  const snap = (
    asOfDate: string,
    totalAssetsBase: number
  ): PortfolioSnapshot => ({
    id: asOfDate,
    asOfDate,
    totalMarketValueBase: totalAssetsBase,
    cashValueBase: 0,
    totalAssetsBase,
  });

  it('无现金流：收益按估值变化', () => {
    const result = calculateTwr({
      snapshots: [snap('2024-01-01', 100), snap('2024-01-02', 110)],
      externalCashFlows: [],
      cashFlowTiming: 'end_of_day',
      expectedValuationDates: ['2024-01-01', '2024-01-02'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toBeCloseTo(0.1, 8);
  });

  it('负收益', () => {
    const result = calculateTwr({
      snapshots: [snap('2024-01-01', 100), snap('2024-01-02', 90)],
      externalCashFlows: [],
      cashFlowTiming: 'end_of_day',
      expectedValuationDates: ['2024-01-01', '2024-01-02'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toBeCloseTo(-0.1, 8);
  });

  it('含外部入金时剔除现金流影响', () => {
    // V0=100, V1=150 且当日入金 50 → 市场收益 0
    const result = calculateTwr({
      snapshots: [snap('2024-01-01', 100), snap('2024-01-02', 150)],
      externalCashFlows: [{ date: '2024-01-02', amountBase: 50 }],
      cashFlowTiming: 'end_of_day',
      expectedValuationDates: ['2024-01-01', '2024-01-02'],
    });
    expect(result).toEqual({ ok: true, value: 0 });
  });

  it('缺预期估值日拒绝', () => {
    const result = calculateTwr({
      snapshots: [snap('2024-01-01', 100), snap('2024-01-03', 110)],
      externalCashFlows: [],
      cashFlowTiming: 'end_of_day',
      expectedValuationDates: ['2024-01-01', '2024-01-02', '2024-01-03'],
    });
    expect(result).toEqual({ ok: false, error: 'non_contiguous_snapshots' });
  });

  it('多市场休市仍可用连续估值日（沿用昨收体现在快照值中）', () => {
    const result = calculateTwr({
      snapshots: [
        snap('2024-01-01', 100),
        snap('2024-01-02', 100), // 某市场休市，组合快照沿用昨收
        snap('2024-01-03', 105),
      ],
      externalCashFlows: [],
      cashFlowTiming: 'end_of_day',
      expectedValuationDates: ['2024-01-01', '2024-01-02', '2024-01-03'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toBeCloseTo(0.05, 10);
  });

  it('前值零 → zero_prior_value', () => {
    const result = calculateTwr({
      snapshots: [snap('2024-01-01', 0), snap('2024-01-02', 10)],
      externalCashFlows: [],
      cashFlowTiming: 'end_of_day',
      expectedValuationDates: ['2024-01-01', '2024-01-02'],
    });
    expect(result).toEqual({ ok: false, error: 'zero_prior_value' });
  });
});
