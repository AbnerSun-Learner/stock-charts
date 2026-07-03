import { takeLast } from './returns';

export type Ma200State = 'above' | 'near' | 'below';

/** 简单移动平均 */
export function computeSma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const window = takeLast(closes, period);
  return window.reduce((sum, v) => sum + v, 0) / period;
}

/** MA200 及相对位置状态 */
export function computeMa200State(
  closes: number[],
  currentPrice: number,
  nearBand = 0.03
): { ma200: number; priceToMa200: number; state: Ma200State } | null {
  const ma200 = computeSma(closes, 200);
  if (ma200 === null || ma200 <= 0) return null;

  const priceToMa200 = currentPrice / ma200 - 1;
  let state: Ma200State = 'near';
  if (priceToMa200 > nearBand) state = 'above';
  else if (priceToMa200 < -nearBand) state = 'below';

  return { ma200, priceToMa200, state };
}
