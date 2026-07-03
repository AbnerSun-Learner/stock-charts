'use client';

import { HelpTooltip } from '@/components/shared/help-tooltip';
import {
  buildFirstPositionByType,
  buildLegGridRowMap,
  getDisplayDropRate,
  getGridRowKey,
  GRID_TYPE_META,
} from '@/components/grid/grid-table-row-helpers';
import type { GridRow } from '@/types/grid';
import type { AggregatedGridRow, GridLeg } from '@/types/grid-v2';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';

interface GridResultTableProps {
  aggregatedRows: AggregatedGridRow[];
  legs: GridLeg[];
  basePrice: number;
  priceDecimals: number;
}

type GroupTableRow = {
  kind: 'group';
  key: string;
  sortPrice: number;
  aggregated: AggregatedGridRow;
  childLegIds: string[];
};

type DetailTableRow = {
  kind: 'detail';
  key: string;
  sortPrice: number;
  row: GridRow;
  childLegIds: string[];
};

type ResultTableRow = GroupTableRow | DetailTableRow;

const DETAIL_CELL_CLS =
  'p-2 sm:p-4 text-sm text-[var(--foreground)] whitespace-nowrap';

/** 与 Ant Design 展开列宽度对齐 */
const EXPAND_COL_WIDTH = 48;
const LEG_COUNT_COL_WIDTH = 72;

function TypeBadge({ gridType }: { gridType: GridRow['gridType'] }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${GRID_TYPE_META[gridType]}`}
    >
      {gridType}
    </span>
  );
}

function DropRateCell({
  row,
  firstPositionByType,
}: {
  row: GridRow;
  firstPositionByType: Map<string, number>;
}) {
  const displayDropRate = getDisplayDropRate(row, firstPositionByType);
  return (
    <span
      className="text-sm font-medium"
      style={{
        color: displayDropRate < 0 ? 'var(--loss)' : 'var(--foreground)',
      }}
    >
      {displayDropRate === 0 ? '—' : `${displayDropRate.toFixed(2)}%`}
    </span>
  );
}

function DetailRowCells({
  row,
  firstPositionByType,
  priceDecimals,
}: {
  row: GridRow;
  firstPositionByType: Map<string, number>;
  priceDecimals: number;
}) {
  return (
    <>
      <td className={DETAIL_CELL_CLS}>
        <TypeBadge gridType={row.gridType} />
      </td>
      <td className={DETAIL_CELL_CLS}>{row.position.toFixed(2)}</td>
      <td className={DETAIL_CELL_CLS}>{row.buyPrice.toFixed(priceDecimals)}</td>
      <td className={DETAIL_CELL_CLS}>
        <DropRateCell row={row} firstPositionByType={firstPositionByType} />
      </td>
      <td className={DETAIL_CELL_CLS}>{row.buyAmount.toLocaleString()}</td>
      <td className={DETAIL_CELL_CLS}>{row.buyShares.toLocaleString()}</td>
      <td className={DETAIL_CELL_CLS}>{row.sellPrice.toFixed(priceDecimals)}</td>
      <td className={DETAIL_CELL_CLS}>{row.sellShares.toLocaleString()}</td>
      <td className={DETAIL_CELL_CLS}>{row.sellAmount.toLocaleString()}</td>
    </>
  );
}

function ExpandedLegRows({
  legIds,
  legRowMap,
  firstPositionByType,
  priceDecimals,
}: {
  legIds: string[];
  legRowMap: Map<string, GridRow>;
  firstPositionByType: Map<string, number>;
  priceDecimals: number;
}) {
  const data = legIds
    .map(id => legRowMap.get(id))
    .filter((row): row is GridRow => row !== undefined)
    .sort((a, b) => b.buyPrice - a.buyPrice);

  return (
    <table className="grid-result-expanded-table w-full border-collapse">
      <colgroup>
        <col style={{ width: EXPAND_COL_WIDTH }} />
        <col />
        <col />
        <col />
        <col />
        <col />
        <col />
        <col />
        <col />
        <col />
        <col style={{ width: LEG_COUNT_COL_WIDTH }} />
      </colgroup>
      <tbody>
        {data.map(row => (
          <tr
            key={getGridRowKey(row)}
            className="grid-result-detail-row border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--hover-bg)]"
          >
            <td className="grid-result-expand-spacer" aria-hidden />
            <DetailRowCells
              row={row}
              firstPositionByType={firstPositionByType}
              priceDecimals={priceDecimals}
            />
            <td className={`${DETAIL_CELL_CLS} text-[var(--muted-foreground)]`}>
              —
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function GridResultTable({
  aggregatedRows,
  legs,
  basePrice,
  priceDecimals,
}: GridResultTableProps) {
  const legRowMap = useMemo(
    () => buildLegGridRowMap(legs, basePrice),
    [legs, basePrice]
  );
  const firstPositionByType = useMemo(
    () => buildFirstPositionByType(legs),
    [legs]
  );

  const tableRows = useMemo((): ResultTableRow[] => {
    const sorted = [...aggregatedRows].sort(
      (a, b) => b.triggerBuyPrice - a.triggerBuyPrice
    );

    return sorted.map(agg => {
      if (agg.childLegIds.length === 1) {
        const legId = agg.childLegIds[0];
        const row = legRowMap.get(legId);
        return {
          kind: 'detail' as const,
          key: `detail-${legId}`,
          sortPrice: agg.triggerBuyPrice,
          row: row ?? {
            position: 0,
            buyTriggerPrice: 0,
            buyPrice: agg.displayBuyPrice,
            buyAmount: Math.round(agg.totalBuyAmount),
            buyShares: agg.totalBuyShares,
            sellTriggerPrice: 0,
            sellPrice: 0,
            sellShares: 0,
            sellAmount: 0,
            priceDropRate: 0,
            gridType: agg.gridTypes[0] ?? '小网',
          },
          childLegIds: agg.childLegIds,
        };
      }

      return {
        kind: 'group' as const,
        key: `group-${agg.clusterId}`,
        sortPrice: agg.triggerBuyPrice,
        aggregated: agg,
        childLegIds: agg.childLegIds,
      };
    });
  }, [aggregatedRows, legRowMap]);

  const columns: ColumnsType<ResultTableRow> = [
    {
      title: '类型',
      width: 112,
      render: (_: unknown, record: ResultTableRow) => {
        if (record.kind === 'group') {
          return (
            <span className="font-medium text-[var(--foreground)]">
              {record.aggregated.displayType}
            </span>
          );
        }
        return <TypeBadge gridType={record.row.gridType} />;
      },
    },
    {
      title: '档位',
      width: 72,
      render: (_: unknown, record: ResultTableRow) =>
        record.kind === 'detail' ? record.row.position.toFixed(2) : '—',
    },
    {
      title: '买入价',
      width: 88,
      render: (_: unknown, record: ResultTableRow) => {
        if (record.kind === 'group') {
          return (
            <span
              title={`展示价 ${record.aggregated.displayBuyPrice.toFixed(priceDecimals)}`}
            >
              {record.aggregated.triggerBuyPrice.toFixed(priceDecimals)}
            </span>
          );
        }
        return record.row.buyPrice.toFixed(priceDecimals);
      },
    },
    {
      title: (
        <div className="flex items-center gap-1">
          <span>跌幅</span>
          <HelpTooltip
            title="相对于上一档位的跌幅"
            placement="bottomLeft"
            maxWidth="12rem"
          />
        </div>
      ),
      width: 88,
      render: (_: unknown, record: ResultTableRow) => {
        if (record.kind === 'group') return '—';
        return (
          <DropRateCell
            row={record.row}
            firstPositionByType={firstPositionByType}
          />
        );
      },
    },
    {
      title: '买入金额',
      width: 96,
      render: (_: unknown, record: ResultTableRow) => {
        const amount =
          record.kind === 'group'
            ? Math.round(record.aggregated.totalBuyAmount)
            : record.row.buyAmount;
        return amount.toLocaleString();
      },
    },
    {
      title: '买入股数',
      width: 96,
      render: (_: unknown, record: ResultTableRow) => {
        const shares =
          record.kind === 'group'
            ? record.aggregated.totalBuyShares
            : record.row.buyShares;
        return shares.toLocaleString();
      },
    },
    {
      title: '卖出价',
      width: 88,
      render: (_: unknown, record: ResultTableRow) =>
        record.kind === 'detail'
          ? record.row.sellPrice.toFixed(priceDecimals)
          : '—',
    },
    {
      title: '卖出股数',
      width: 96,
      render: (_: unknown, record: ResultTableRow) =>
        record.kind === 'detail'
          ? record.row.sellShares.toLocaleString()
          : '—',
    },
    {
      title: '卖出金额',
      width: 96,
      render: (_: unknown, record: ResultTableRow) =>
        record.kind === 'detail'
          ? record.row.sellAmount.toLocaleString()
          : '—',
    },
    {
      title: '子腿数',
      width: LEG_COUNT_COL_WIDTH,
      render: (_: unknown, record: ResultTableRow) =>
        record.childLegIds.length > 1 ? record.childLegIds.length : '—',
    },
  ];

  if (tableRows.length === 0) return null;

  return (
    <div className="mb-8">
      <p className="mb-4 text-xs leading-relaxed text-[var(--muted-foreground)]">
        同价位小/中/大网已合并为聚合组；展开查看各子腿买卖明细
      </p>

      <div
        className="overflow-x-auto rounded-xl border border-[var(--border)] shadow-[var(--ds-shadow-sm)] [-webkit-overflow-scrolling:touch]"
        aria-label="网格结果表，可横向滚动"
      >
        <Table<ResultTableRow>
          columns={columns}
          dataSource={tableRows}
          rowKey="key"
          pagination={false}
          tableLayout="fixed"
          className="grid-result-table min-w-[800px]"
          expandable={{
            expandedRowClassName: () => 'grid-result-expanded-row',
            expandedRowRender: record =>
              record.kind === 'group' ? (
                <ExpandedLegRows
                  legIds={record.childLegIds}
                  legRowMap={legRowMap}
                  firstPositionByType={firstPositionByType}
                  priceDecimals={priceDecimals}
                />
              ) : null,
            rowExpandable: record =>
              record.kind === 'group' && record.childLegIds.length > 1,
          }}
        />
      </div>
    </div>
  );
}
