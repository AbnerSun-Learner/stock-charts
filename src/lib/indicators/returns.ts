/**
 * 计算日收益率序列。
 * return[t] = close[t] / close[t-1] - 1
 */
export function computeDailyReturns(closes: number[]): number[] {
  if (closes.length < 2) return [];

  const returns: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1];
    if (prev <= 0) continue;
    returns.push(closes[i] / prev - 1);
  }
  return returns;
}

/** 取序列最后 N 个元素 */
export function takeLast<T>(values: T[], count: number): T[] {
  if (count <= 0 || values.length === 0) return [];
  return values.slice(Math.max(0, values.length - count));
}
