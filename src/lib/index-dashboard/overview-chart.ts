import type { IndexMetricPoint } from '@/types/index-dashboard';

/** 双轴走势统一行。 */
export interface OverviewChartRow {
  date: string;
  close?: number;
  pe?: number;
}

export interface OverviewChartSeries {
  rows: OverviewChartRow[];
  latestClose: { date: string; close: number } | null;
  hasPe: boolean;
}

/**
 * 将指数点位格式化为 K 单位（如 3413 → 3.4K）。
 */
export function formatIndexPointsInK(value: number): string {
  const kilo = value / 1000;
  if (!Number.isFinite(kilo)) return '0K';
  const rounded = Math.round(kilo * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}K`;
}

/** 当前窗口是否存在可绘制的市盈率序列。 */
export function hasPeSeries(points: IndexMetricPoint[]): boolean {
  return points.some(point => point.peTtm != null && Number.isFinite(point.peTtm) && point.peTtm > 0);
}

/**
 * 构建双轴走势统一序列（按日期升序）。
 * 仅在有收盘时写入 close；开启市盈率且 pe 有效时写入 pe。
 */
export function buildOverviewChartSeries(points: IndexMetricPoint[], showPeLine: boolean): OverviewChartSeries {
  const sorted = [...points].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  const rows: OverviewChartRow[] = [];

  for (const point of sorted) {
    const row: OverviewChartRow = { date: point.tradeDate };
    if (point.close != null && Number.isFinite(point.close)) {
      row.close = point.close;
    }
    if (showPeLine && point.peTtm != null && Number.isFinite(point.peTtm) && point.peTtm > 0) {
      row.pe = point.peTtm;
    }
    if (row.close != null || row.pe != null) {
      rows.push(row);
    }
  }

  const withClose = rows.filter((row): row is OverviewChartRow & { close: number } => row.close != null);
  return {
    rows,
    latestClose: withClose.length ? { date: withClose.at(-1)!.date, close: withClose.at(-1)!.close } : null,
    hasPe: showPeLine && rows.some(row => row.pe != null),
  };
}
