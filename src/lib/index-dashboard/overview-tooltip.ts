import { calcDeviationPct } from '@/lib/index-dashboard/valuation-judge';
import type { IndexMetricPoint } from '@/types/index-dashboard';

/** 走势图 hover 快照（单日）。 */
export interface OverviewTooltipSnapshot {
  date: string;
  indexTitle: string;
  close: number | null;
  /** 相对窗口内首个收盘的累计涨跌（%）。 */
  cumulativeReturnPct: number | null;
  /** 相对截至当日窗口内高点的回撤（%）。 */
  drawdownFromPeakPct: number | null;
  pe: number | null;
  /** 相对当前窗口全部 PE 样本的历史分位（%）。 */
  peHistoricalPercentile: number | null;
  pePercentile5y: number | null;
  pePercentile10y: number | null;
  peAvg5y: number | null;
  peAvg10y: number | null;
  peDeviation5yPct: number | null;
  peDeviation10yPct: number | null;
}

export interface OverviewTooltipIndex {
  byDate: Map<string, OverviewTooltipSnapshot>;
}

function toUtcDate(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

function yearsBefore(iso: string, years: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

function empiricPercentile(sample: number[], value: number): number | null {
  if (sample.length === 0) return null;
  const le = sample.filter(item => item <= value).length;
  return (le / sample.length) * 100;
}

function mean(sample: number[]): number | null {
  if (sample.length === 0) return null;
  return sample.reduce((sum, item) => sum + item, 0) / sample.length;
}

function formatIndexTitle(indexName: string, indexCode: string): string {
  const shortCode = indexCode.replace(/\.(SH|SZ|BJ)$/i, '');
  return `${indexName} (${shortCode})`;
}

/**
 * 预计算窗口内每日 hover 文案所需字段。
 * PE 相关项在 `includePe=false` 或当日无 PE 时为 null。
 */
export function buildOverviewTooltipIndex(
  points: IndexMetricPoint[],
  options: { indexName: string; indexCode: string; includePe: boolean }
): OverviewTooltipIndex {
  const sorted = [...points].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  const indexTitle = formatIndexTitle(options.indexName, options.indexCode);
  const byDate = new Map<string, OverviewTooltipSnapshot>();

  const closes = sorted
    .filter(point => point.close != null && Number.isFinite(point.close))
    .map(point => ({ date: point.tradeDate, close: point.close as number }));
  const firstClose = closes[0]?.close ?? null;

  let peak = firstClose;
  const closeStats = new Map<string, { cumulativeReturnPct: number | null; drawdownFromPeakPct: number | null; close: number }>();
  for (const item of closes) {
    if (peak == null || item.close > peak) peak = item.close;
    closeStats.set(item.date, {
      close: item.close,
      cumulativeReturnPct:
        firstClose != null && firstClose > 0 ? ((item.close / firstClose) - 1) * 100 : null,
      drawdownFromPeakPct: peak != null && peak > 0 ? ((item.close / peak) - 1) * 100 : null,
    });
  }

  const peSeries = options.includePe
    ? sorted
        .filter(point => point.peTtm != null && Number.isFinite(point.peTtm) && point.peTtm > 0)
        .map(point => ({ date: point.tradeDate, pe: point.peTtm as number, t: toUtcDate(point.tradeDate) }))
    : [];
  const allPeValues = peSeries.map(item => item.pe);

  const peByDate = new Map<string, {
    pe: number;
    peHistoricalPercentile: number | null;
    pePercentile5y: number | null;
    pePercentile10y: number | null;
    peAvg5y: number | null;
    peAvg10y: number | null;
    peDeviation5yPct: number | null;
    peDeviation10yPct: number | null;
  }>();

  let left5 = 0;
  let left10 = 0;
  for (let i = 0; i < peSeries.length; i += 1) {
    const current = peSeries[i];
    const bound5 = toUtcDate(yearsBefore(current.date, 5));
    const bound10 = toUtcDate(yearsBefore(current.date, 10));
    while (left5 < i && peSeries[left5].t < bound5) left5 += 1;
    while (left10 < i && peSeries[left10].t < bound10) left10 += 1;

    const window5 = peSeries.slice(left5, i + 1).map(item => item.pe);
    const window10 = peSeries.slice(left10, i + 1).map(item => item.pe);
    const avg5 = mean(window5);
    const avg10 = mean(window10);

    peByDate.set(current.date, {
      pe: current.pe,
      peHistoricalPercentile: empiricPercentile(allPeValues, current.pe),
      pePercentile5y: empiricPercentile(window5, current.pe),
      pePercentile10y: empiricPercentile(window10, current.pe),
      peAvg5y: avg5,
      peAvg10y: avg10,
      peDeviation5yPct: calcDeviationPct(current.pe, avg5),
      peDeviation10yPct: calcDeviationPct(current.pe, avg10),
    });
  }

  const dates = new Set<string>([...closeStats.keys(), ...peByDate.keys()]);
  for (const date of dates) {
    const closeRow = closeStats.get(date);
    const peRow = peByDate.get(date);
    byDate.set(date, {
      date,
      indexTitle,
      close: closeRow?.close ?? null,
      cumulativeReturnPct: closeRow?.cumulativeReturnPct ?? null,
      drawdownFromPeakPct: closeRow?.drawdownFromPeakPct ?? null,
      pe: peRow?.pe ?? null,
      peHistoricalPercentile: peRow?.peHistoricalPercentile ?? null,
      pePercentile5y: peRow?.pePercentile5y ?? null,
      pePercentile10y: peRow?.pePercentile10y ?? null,
      peAvg5y: peRow?.peAvg5y ?? null,
      peAvg10y: peRow?.peAvg10y ?? null,
      peDeviation5yPct: peRow?.peDeviation5yPct ?? null,
      peDeviation10yPct: peRow?.peDeviation10yPct ?? null,
    });
  }

  return { byDate };
}

/** A 股习惯：涨红跌绿。 */
export function signedPctClass(value: number | null): 'up' | 'down' | 'flat' {
  if (value == null || value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}

export function formatSignedPct(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value).toFixed(digits);
  if (value > 0) return `${abs}%`;
  if (value < 0) return `-${abs}%`;
  return `${abs}%`;
}

/**
 * 渲染走势图自定义 tooltip HTML（供 G2 interaction.tooltip.render 使用）。
 */
export function renderOverviewTooltipHtml(snapshot: OverviewTooltipSnapshot | null): string {
  if (!snapshot) return '';

  const pctColor = (value: number | null): string => {
    const tone = signedPctClass(value);
    if (tone === 'up') return '#dc2626';
    if (tone === 'down') return '#16a34a';
    return '#64748b';
  };

  const row = (label: string, value: string, color?: string): string =>
    `<div style="display:flex;justify-content:space-between;gap:16px;line-height:1.6;font-size:12px">` +
    `<span style="color:#64748b">${label}</span>` +
    `<span style="color:${color ?? '#0f172a'};font-variant-numeric:tabular-nums">${value}</span>` +
    `</div>`;

  const section = (dot: string, body: string): string =>
    `<div style="display:flex;gap:8px;padding:8px 0;border-top:1px dotted #e2e8f0">` +
    `<span style="width:8px;height:8px;border-radius:50%;background:${dot};margin-top:5px;flex:none"></span>` +
    `<div style="flex:1;min-width:0">${body}</div>` +
    `</div>`;

  const header =
    `<div style="display:flex;align-items:flex-start;gap:8px;padding-bottom:4px">` +
    `<span style="width:8px;height:8px;border-radius:50%;background:#1e293b;margin-top:5px;flex:none"></span>` +
    `<div>` +
    `<div style="font-size:13px;font-weight:600;color:#0f172a">${snapshot.indexTitle}</div>` +
    `<div style="font-size:12px;color:#94a3b8">${snapshot.date}</div>` +
    `</div></div>`;

  const closeBody =
    row('收盘价', snapshot.close != null ? snapshot.close.toFixed(4) : '—') +
    row('历史累计涨跌', formatSignedPct(snapshot.cumulativeReturnPct), pctColor(snapshot.cumulativeReturnPct)) +
    row('距前高下跌', formatSignedPct(snapshot.drawdownFromPeakPct), pctColor(snapshot.drawdownFromPeakPct));

  let html =
    `<div style="min-width:220px;padding:4px 2px;font-family:inherit">` +
    header +
    section('#0f766e', closeBody);

  if (snapshot.pe != null) {
    html += section(
      '#c2410c',
      row('市盈率', snapshot.pe.toFixed(2)) +
        row('历史分位', snapshot.peHistoricalPercentile != null ? `${snapshot.peHistoricalPercentile.toFixed(2)}%` : '—') +
        row('五年分位', snapshot.pePercentile5y != null ? `${snapshot.pePercentile5y.toFixed(2)}%` : '—') +
        row('十年分位', snapshot.pePercentile10y != null ? `${snapshot.pePercentile10y.toFixed(2)}%` : '—')
    );
    html += section(
      '#fda4af',
      row('市盈五年均值', snapshot.peAvg5y != null ? snapshot.peAvg5y.toFixed(2) : '—') +
        row('现值偏离', formatSignedPct(snapshot.peDeviation5yPct), pctColor(snapshot.peDeviation5yPct))
    );
    html += section(
      '#fb7185',
      row('市盈十年均值', snapshot.peAvg10y != null ? snapshot.peAvg10y.toFixed(2) : '—') +
        row('现值偏离', formatSignedPct(snapshot.peDeviation10yPct), pctColor(snapshot.peDeviation10yPct))
    );
  }

  html += `</div>`;
  return html;
}
