import type {
  FamilyAssetHistory,
  FamilyAssetHistoryRow,
  MemberAssetHistorySeries,
  StructureFourPot,
} from '@/types/family-finance';

/** 将视图行拆成每位成员的独立三笔钱折线序列。 */
export function buildFamilyAssetHistory(
  rows: FamilyAssetHistoryRow[]
): FamilyAssetHistory {
  const latestDate = rows.reduce(
    (latest, row) => (row.date > latest ? row.date : latest),
    ''
  );
  const latestHouseholdAmountByPot = new Map<StructureFourPot, number>();
  for (const row of rows) {
    if (row.date !== latestDate) continue;
    latestHouseholdAmountByPot.set(
      row.fourPot,
      (latestHouseholdAmountByPot.get(row.fourPot) ?? 0) + row.totalAssets
    );
  }

  const memberById = new Map<string, MemberAssetHistorySeries>();
  for (const row of rows) {
    const series = memberById.get(row.memberId) ?? {
      memberId: row.memberId,
      memberName: row.memberName,
      sortOrder: row.sortOrder,
      points: [],
    };
    series.memberName = row.memberName;
    series.sortOrder = row.sortOrder;
    const latestHouseholdAmount = latestHouseholdAmountByPot.get(row.fourPot) ?? 0;
    series.points.push({
      date: row.date,
      amount: row.totalAssets,
      fourPot: row.fourPot,
      potOrder: row.potOrder,
      ...(row.date === latestDate
        ? {
            latestHouseholdAmount,
            latestShareRatio:
              latestHouseholdAmount === 0
                ? null
                : row.totalAssets / latestHouseholdAmount,
          }
        : {}),
    });
    memberById.set(row.memberId, series);
  }

  const members = Array.from(memberById.values())
    .map(series => ({
      ...series,
      points: [...series.points].sort(
        (a, b) => a.date.localeCompare(b.date) || a.potOrder - b.potOrder
      ),
    }))
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.memberName.localeCompare(b.memberName, 'zh-CN')
    );

  return members;
}
