import { computeDailyReturns, takeLast } from './returns';
import { sampleStd } from './volatility';

/** 带交易日的收盘价 */
export interface DatedClose {
  date: string;
  close: number;
}

/** 两序列 Pearson 相关系数 */
export function pearsonCorrelation(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;

  const meanA = a.reduce((sum, v) => sum + v, 0) / a.length;
  const meanB = b.reduce((sum, v) => sum + v, 0) / b.length;

  let cov = 0;
  for (let i = 0; i < a.length; i += 1) {
    cov += (a[i] - meanA) * (b[i] - meanB);
  }
  cov /= a.length - 1;

  const stdA = sampleStd(a);
  const stdB = sampleStd(b);
  if (stdA === null || stdB === null || stdA === 0 || stdB === 0) {
    return null;
  }

  return cov / (stdA * stdB);
}

/** 按交易日 inner join 对齐两条收盘序列（升序） */
export function alignClosesByDate(
  seriesA: DatedClose[],
  seriesB: DatedClose[]
): { closesA: number[]; closesB: number[]; dates: string[] } {
  const sortedA = [...seriesA].sort((x, y) => x.date.localeCompare(y.date));
  const sortedB = [...seriesB].sort((x, y) => x.date.localeCompare(y.date));

  const closesA: number[] = [];
  const closesB: number[] = [];
  const dates: string[] = [];
  let i = 0;
  let j = 0;

  while (i < sortedA.length && j < sortedB.length) {
    const cmp = sortedA[i].date.localeCompare(sortedB[j].date);
    if (cmp === 0) {
      closesA.push(sortedA[i].close);
      closesB.push(sortedB[j].close);
      dates.push(sortedA[i].date);
      i += 1;
      j += 1;
    } else if (cmp < 0) {
      i += 1;
    } else {
      j += 1;
    }
  }

  return { closesA, closesB, dates };
}

/** 按日期对齐收盘价后计算窗口内 Pearson 相关 */
export function computeReturnCorrelation(
  seriesA: DatedClose[],
  seriesB: DatedClose[],
  window: number
): number | null {
  const { closesA, closesB } = alignClosesByDate(seriesA, seriesB);
  if (closesA.length < window + 1) return null;

  const returnsA = takeLast(computeDailyReturns(closesA), window);
  const returnsB = takeLast(computeDailyReturns(closesB), window);

  if (returnsA.length < window || returnsB.length < window) return null;
  return pearsonCorrelation(returnsA, returnsB);
}

export interface CorrelationMatrix {
  symbols: string[];
  window: number;
  matrix: number[][];
}

/** 多标的 Pearson 相关矩阵 */
export function buildCorrelationMatrix(
  symbolSeries: Record<string, DatedClose[]>,
  symbols: string[],
  window: number
): CorrelationMatrix | null {
  const matrix: number[][] = symbols.map(() =>
    symbols.map(() => Number.NaN)
  );

  for (let i = 0; i < symbols.length; i += 1) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < symbols.length; j += 1) {
      const corr = computeReturnCorrelation(
        symbolSeries[symbols[i]],
        symbolSeries[symbols[j]],
        window
      );
      if (corr === null) return null;
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }

  return { symbols, window, matrix };
}
