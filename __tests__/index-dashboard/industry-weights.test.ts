import {
  aggregateTopIndustryWeights,
  filterWeightsByLevel,
  prepareIndustryPieData,
  summarizeIndustryConcentration,
} from '@/lib/index-dashboard/industry-weights';
import type { IndustryWeight } from '@/types/index-dashboard';

function weight(name: string, pct: number, level: IndustryWeight['swLevel'] = 'sw1'): IndustryWeight {
  return {
    indexCode: '000300.SH',
    asOfDate: '2026-05-06',
    swLevel: level,
    industryName: name,
    weightPct: pct,
  };
}

describe('aggregateTopIndustryWeights', () => {
  it('空数组返回空', () => {
    expect(aggregateTopIndustryWeights([])).toEqual([]);
  });

  it('不超过 TopN 时不生成其他', () => {
    const bars = aggregateTopIndustryWeights(
      [weight('银行', 10), weight('医药', 8)],
      15
    );
    expect(bars).toHaveLength(2);
    expect(bars.every(b => !b.isOther)).toBe(true);
  });

  it('超出 TopN 时合并为其他', () => {
    const rows = Array.from({ length: 5 }, (_, i) => weight(`行业${i}`, 10 - i));
    const bars = aggregateTopIndustryWeights(rows, 3);
    expect(bars).toHaveLength(4);
    expect(bars[0].name).toBe('行业0');
    expect(bars[3].name).toBe('其他');
    expect(bars[3].isOther).toBe(true);
    expect(bars[3].weightPct).toBe(13);
  });
});

describe('filterWeightsByLevel', () => {
  it('按 sw_level 过滤', () => {
    const rows = [weight('A', 1, 'sw1'), weight('B', 2, 'sw2'), weight('C', 3, 'sw1')];
    expect(filterWeightsByLevel(rows, 'sw1')).toHaveLength(2);
    expect(filterWeightsByLevel(rows, 'sw3')).toHaveLength(0);
  });
});

describe('prepareIndustryPieData', () => {
  it('最多展示前十行业并把其余项合并为其他', () => {
    const rows = Array.from({ length: 28 }, (_, i) => weight(`行业${i}`, 28 - i));

    const pieData = prepareIndustryPieData(rows);

    expect(pieData).toHaveLength(11);
    expect(pieData.slice(0, 10).map(item => item.name)).toEqual(
      Array.from({ length: 10 }, (_, i) => `行业${i}`)
    );
    expect(pieData[10]).toMatchObject({ name: '其他', isOther: true });
  });
});

describe('summarizeIndustryConcentration', () => {
  it('按权重选出前三行业并计算合计占比', () => {
    expect(
      summarizeIndustryConcentration(
        [weight('医药', 8), weight('银行', 12), weight('电子', 10), weight('食品', 5)],
        3
      )
    ).toEqual({
      topIndustries: [
        { name: '银行', weightPct: 12, isOther: false },
        { name: '电子', weightPct: 10, isOther: false },
        { name: '医药', weightPct: 8, isOther: false },
      ],
      combinedWeightPct: 30,
    });
  });

  it('空数组或非正 topN 返回空摘要', () => {
    const emptySummary = { topIndustries: [], combinedWeightPct: 0 };

    expect(summarizeIndustryConcentration([], 3)).toEqual(emptySummary);
    expect(summarizeIndustryConcentration([weight('银行', 12)], 0)).toEqual(emptySummary);
  });
});
