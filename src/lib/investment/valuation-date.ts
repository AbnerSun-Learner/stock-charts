/** 取持仓/现金快照中的最新估值日 */
export function resolveLatestValuationDate(
  rows: Array<{ asOfDate: string }>
): string | null {
  if (rows.length === 0) {
    return null;
  }
  return rows
    .map(item => item.asOfDate)
    .reduce((latest, date) => (date > latest ? date : latest));
}

/** 仅保留指定估值日快照，避免多日行重复累加 */
export function filterLedgerAsOfDate<T extends { asOfDate: string }>(
  rows: T[],
  asOfDate: string | null
): T[] {
  if (!asOfDate) {
    return rows;
  }
  return rows.filter(row => row.asOfDate === asOfDate);
}
