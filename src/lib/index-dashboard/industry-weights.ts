import type { IndustryWeight, IndustryWeightBar } from '@/types/index-dashboard';

const OTHER_LABEL = '其他';

export interface IndustryConcentrationSummary {
  topIndustries: IndustryWeightBar[];
  combinedWeightPct: number;
}

/**
 * 将行业权重按占比降序取 Top N，其余合并为「其他」。
 */
export function aggregateTopIndustryWeights(
  weights: IndustryWeight[],
  topN: number = 15
): IndustryWeightBar[] {
  if (weights.length === 0 || topN <= 0) {
    return [];
  }

  const sorted = [...weights].sort((a, b) => b.weightPct - a.weightPct);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const bars: IndustryWeightBar[] = top.map(item => ({
    name: item.industryName,
    weightPct: item.weightPct,
    isOther: false,
  }));

  if (rest.length > 0) {
    const otherPct = rest.reduce((sum, item) => sum + item.weightPct, 0);
    bars.push({
      name: OTHER_LABEL,
      weightPct: otherPct,
      isOther: true,
    });
  }

  return bars;
}

/**
 * 饼图标签空间有限，仅展示前十行业，其余合并为「其他」。
 */
export function prepareIndustryPieData(weights: IndustryWeight[]): IndustryWeightBar[] {
  return aggregateTopIndustryWeights(weights, 10);
}

/**
 * 按申万级别过滤权重行。
 */
export function filterWeightsByLevel(
  weights: IndustryWeight[],
  swLevel: IndustryWeight['swLevel']
): IndustryWeight[] {
  return weights.filter(item => item.swLevel === swLevel);
}

/**
 * 提取权重最高的 Top N 行业，并计算其合计占比。
 */
export function summarizeIndustryConcentration(
  weights: IndustryWeight[],
  topN: number = 3
): IndustryConcentrationSummary {
  if (weights.length === 0 || topN <= 0) {
    return { topIndustries: [], combinedWeightPct: 0 };
  }

  const topIndustries = [...weights]
    .sort((a, b) => b.weightPct - a.weightPct)
    .slice(0, topN)
    .map(item => ({
      name: item.industryName,
      weightPct: item.weightPct,
      isOther: false,
    }));

  return {
    topIndustries,
    combinedWeightPct: topIndustries.reduce((sum, item) => sum + item.weightPct, 0),
  };
}
