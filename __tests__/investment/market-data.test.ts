import {
  assertBusinessInstrumentId,
  isCanonicalSymbol,
  isUuidLike,
  isVirtualCashCode,
  toCanonicalSymbol,
  toShortCode,
} from '@/lib/investment/market-data';

describe('market-data', () => {
  it('短码转规范代码', () => {
    expect(toCanonicalSymbol('510300', 'CN')).toBe('510300.SH');
    expect(toCanonicalSymbol('159915', 'CN')).toBe('159915.SZ');
    expect(toCanonicalSymbol('2800', 'HK')).toBe('2800.HK');
    expect(toCanonicalSymbol('VOO', 'US')).toBe('VOO.US');
    expect(toCanonicalSymbol('510300.SH')).toBe('510300.SH');
  });

  it('规范代码转短码', () => {
    expect(toShortCode('510300.SH')).toBe('510300');
  });

  it('禁止 UUID 与虚拟现金码进入业务 instrumentId', () => {
    expect(isUuidLike('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isVirtualCashCode('CASH')).toBe(true);
    expect(isCanonicalSymbol('CASH')).toBe(false);
    expect(() => toCanonicalSymbol('CASH')).toThrow(/虚拟现金/);
    expect(() =>
      assertBusinessInstrumentId('550e8400-e29b-41d4-a716-446655440000')
    ).toThrow(/UUID/);
    expect(() => assertBusinessInstrumentId('510300')).toThrow(/规范代码/);
  });
});
