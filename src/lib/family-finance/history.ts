import type {
  AssetHistoryPoint,
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
    series.points.push(
      buildHistoryPoint(row, latestDate, latestHouseholdAmountByPot)
    );
    memberById.set(row.memberId, series);
  }

  const members = Array.from(memberById.values())
    .map(series => ({
      ...series,
      points: padMissingPotPoints(
        series.points,
        latestDate,
        latestHouseholdAmountByPot
      ),
    }))
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.memberName.localeCompare(b.memberName, 'zh-CN')
    );

  return members;
}

/** 构造单个历史点；仅最新日附带家庭同类占比。 */
function buildHistoryPoint(
  row: Pick<FamilyAssetHistoryRow, 'date' | 'fourPot' | 'potOrder' | 'totalAssets'>,
  latestDate: string,
  latestHouseholdAmountByPot: Map<StructureFourPot, number>
): AssetHistoryPoint {
  const latestHouseholdAmount = latestHouseholdAmountByPot.get(row.fourPot) ?? 0;
  return {
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
  };
}

/**
 * 对成员已有快照日 × 已出现笔钱补齐缺失点为 0。
 * 避免某类笔钱晚录入时折线从首笔日期才起画。
 */
function padMissingPotPoints(
  points: AssetHistoryPoint[],
  latestDate: string,
  latestHouseholdAmountByPot: Map<StructureFourPot, number>
): AssetHistoryPoint[] {
  const dates = [...new Set(points.map(p => p.date))].sort();
  const potMeta = new Map<StructureFourPot, number>();
  for (const point of points) {
    potMeta.set(point.fourPot, point.potOrder);
  }
  const existing = new Set(points.map(p => `${p.date}|${p.fourPot}`));
  const padded = [...points];

  for (const date of dates) {
    for (const [fourPot, potOrder] of potMeta) {
      const key = `${date}|${fourPot}`;
      if (existing.has(key)) continue;
      padded.push(
        buildHistoryPoint(
          { date, fourPot, potOrder, totalAssets: 0 },
          latestDate,
          latestHouseholdAmountByPot
        )
      );
    }
  }

  return padded.sort(
    (a, b) => a.date.localeCompare(b.date) || a.potOrder - b.potOrder
  );
}
