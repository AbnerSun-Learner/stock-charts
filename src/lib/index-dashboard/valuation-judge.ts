import type {
  ValuationComparison,
  ValuationJudgement,
  ValuationSnapshot,
} from '@/types/index-dashboard';

/**
 * 计算相对均值偏离百分比：(current - avg) / avg * 100。
 * 任一为空或均值为 0 时返回 null。
 */
export function calcDeviationPct(
  current: number | null | undefined,
  avg: number | null | undefined
): number | null {
  if (current == null || avg == null || avg === 0) {
    return null;
  }
  return ((current - avg) / avg) * 100;
}

/**
 * 判定当前 PE 是否低于近 5 年 / 近 10 年均值，并生成摘要文案。
 */
export function judgeValuation(snapshot: ValuationSnapshot | null): ValuationJudgement {
  if (snapshot == null || snapshot.currentPeTtm == null) {
    return {
      comparisonTo5y: null,
      comparisonTo10y: null,
      deviationFrom5yPct: null,
      deviationFrom10yPct: null,
      summary: '该指数暂无估值数据',
    };
  }

  const { currentPeTtm, peTtmAvg5y, peTtmAvg10y } = snapshot;
  const comparisonTo5y = compareValuation(currentPeTtm, peTtmAvg5y);
  const comparisonTo10y = compareValuation(currentPeTtm, peTtmAvg10y);
  const deviationFrom5yPct = calcDeviationPct(currentPeTtm, peTtmAvg5y);
  const deviationFrom10yPct = calcDeviationPct(currentPeTtm, peTtmAvg10y);

  return {
    comparisonTo5y,
    comparisonTo10y,
    deviationFrom5yPct,
    deviationFrom10yPct,
    summary: buildValuationSummary(comparisonTo5y, comparisonTo10y),
  };
}

function compareValuation(
  current: number,
  average: number | null
): ValuationComparison | null {
  if (average == null) {
    return null;
  }
  if (current < average) {
    return 'below';
  }
  if (current > average) {
    return 'above';
  }
  return 'equal';
}

export function formatValuationComparison(
  comparison: ValuationComparison,
  label: string
): string {
  const verb = comparison === 'below' ? '低于' : comparison === 'above' ? '高于' : '等于';
  return `${verb}${label}`;
}

function buildValuationSummary(
  comparisonTo5y: ValuationComparison | null,
  comparisonTo10y: ValuationComparison | null
): string {
  if (comparisonTo5y === 'below' && comparisonTo10y === 'below') {
    return '相对近5年与近10年均偏便宜';
  }
  if (comparisonTo5y === 'above' && comparisonTo10y === 'above') {
    return '相对近5年与近10年均偏贵';
  }
  if (comparisonTo5y === 'equal' && comparisonTo10y === 'equal') {
    return '与近5年和近10年均值持平';
  }
  if (comparisonTo5y != null && comparisonTo10y != null) {
    return `${formatValuationComparison(
      comparisonTo5y,
      '近5年均'
    )}，${formatValuationComparison(comparisonTo10y, '近10年均')}`;
  }
  if (comparisonTo5y != null) {
    return formatValuationComparison(comparisonTo5y, '近5年均值');
  }
  if (comparisonTo10y != null) {
    return formatValuationComparison(comparisonTo10y, '近10年均值');
  }
  return '暂无足够均值数据做判定';
}
