import { buildGridStrategyHref, parseGridPrefill } from '@/lib/grid/grid-prefill';

describe('grid prefill', () => {
  it('生成携带 ETF 上下文和最新价的跳转地址', () => {
    expect(buildGridStrategyHref({ etfCode: '510300', etfName: '沪深300ETF', latestPrice: 4.123 })).toBe(
      '/view/grid?etfCode=510300&etfName=%E6%B2%AA%E6%B7%B1300ETF&price=4.123'
    );
  });

  it('只接受有效代码和正价格', () => {
    const parsed = parseGridPrefill(new URLSearchParams('etfCode=bad&etfName=%20x%20&price=-1'));
    expect(parsed).toEqual({ etfCode: null, etfName: 'x', latestPrice: null });
  });
});
