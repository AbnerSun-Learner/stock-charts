import {
  formatMoney,
  formatPercent,
  isMoneyEqual,
  isWeightSumOne,
  roundFxRate,
  roundMoney,
  roundShares,
  roundWeight,
  WEIGHT_EPSILON,
} from '@/lib/investment/money';

describe('money', () => {
  it('金额舍入到 2 位、份额/权重/汇率到 8 位', () => {
    expect(roundMoney(1.234)).toBe(1.23);
    expect(roundMoney(1.235)).toBe(1.24);
    expect(roundShares(1.123456789)).toBe(1.12345679);
    expect(roundWeight(0.3333333333)).toBe(0.33333333);
    expect(roundFxRate(7.123456789)).toBe(7.12345679);
  });

  it('权重和容差为 1e-8，金额容差为 1e-6', () => {
    expect(isWeightSumOne(1 + WEIGHT_EPSILON / 2)).toBe(true);
    expect(isWeightSumOne(1 + WEIGHT_EPSILON * 2)).toBe(false);
    expect(isMoneyEqual(1, 1 + 1e-7)).toBe(true);
    expect(isMoneyEqual(1, 1 + 1e-5)).toBe(false);
  });

  it('格式化金额与百分比', () => {
    expect(formatMoney(12.3)).toBe('12.30');
    expect(formatPercent(0.156)).toBe('15.60%');
  });
});
