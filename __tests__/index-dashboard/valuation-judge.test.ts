import { judgeValuation, calcDeviationPct } from '@/lib/index-dashboard/valuation-judge';
import type { ValuationSnapshot } from '@/types/index-dashboard';

function snapshot(partial: Partial<ValuationSnapshot> = {}): ValuationSnapshot {
  return {
    indexCode: '000300.SH',
    tradeDate: '2026-07-17',
    currentPeTtm: 13,
    peTtmAvg5y: 14,
    peTtmAvg10y: 15,
    ...partial,
  };
}

describe('calcDeviationPct', () => {
  it('计算相对偏离百分比', () => {
    expect(calcDeviationPct(15, 10)).toBe(50);
    expect(calcDeviationPct(8, 10)).toBe(-20);
  });

  it('空值或均值为 0 时返回 null', () => {
    expect(calcDeviationPct(null, 10)).toBeNull();
    expect(calcDeviationPct(10, null)).toBeNull();
    expect(calcDeviationPct(10, 0)).toBeNull();
  });
});

describe('judgeValuation', () => {
  it('无快照或无当前 PE 时返回空态', () => {
    expect(judgeValuation(null).summary).toBe('该指数暂无估值数据');
    expect(judgeValuation(snapshot({ currentPeTtm: null })).comparisonTo5y).toBeNull();
  });

  it('当前低于近5年与近10年均', () => {
    const result = judgeValuation(snapshot({ currentPeTtm: 10, peTtmAvg5y: 12, peTtmAvg10y: 13 }));
    expect(result.comparisonTo5y).toBe('below');
    expect(result.comparisonTo10y).toBe('below');
    expect(result.summary).toBe('相对近5年与近10年均偏便宜');
  });

  it('当前高于近5年与近10年均', () => {
    const result = judgeValuation(snapshot({ currentPeTtm: 20, peTtmAvg5y: 12, peTtmAvg10y: 13 }));
    expect(result.comparisonTo5y).toBe('above');
    expect(result.comparisonTo10y).toBe('above');
    expect(result.summary).toBe('相对近5年与近10年均偏贵');
  });

  it('当前等于历史均值时显示持平', () => {
    const result = judgeValuation(snapshot({ currentPeTtm: 12, peTtmAvg5y: 12, peTtmAvg10y: 12 }));
    expect(result.comparisonTo5y).toBe('equal');
    expect(result.comparisonTo10y).toBe('equal');
    expect(result.summary).toBe('与近5年和近10年均值持平');
  });

  it('仅有一侧均值时给出单侧文案', () => {
    const result = judgeValuation(
      snapshot({ currentPeTtm: 10, peTtmAvg5y: 12, peTtmAvg10y: null })
    );
    expect(result.comparisonTo5y).toBe('below');
    expect(result.comparisonTo10y).toBeNull();
    expect(result.summary).toBe('低于近5年均值');
  });
});
