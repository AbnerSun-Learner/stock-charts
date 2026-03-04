'use client';

import { useEffect, useState, useRef } from 'react';
import { Sunburst } from '@ant-design/charts';

interface SunburstNode {
  name: string;
  shares?: number;
  percentage?: string;
  children?: SunburstNode[];
}

interface ChartNode {
  name: string;
  value: number;
  /** 一级分类名，用于同色 */
  category?: string;
  shares?: number;
  percentage?: string;
  children?: ChartNode[];
}

function parsePct(p: string | number | undefined): number {
  if (typeof p === 'number') return p;
  if (typeof p === 'string') return parseFloat(p.replace('%', '')) || 0;
  return 0;
}

const L1_COLOR_MAP: Record<string, string> = {
  A股: '#6891A7',
  货币: '#00516C',
  海外新兴: '#EA8F74',
  债券: '#02A4DC',
  海外成熟: '#00968F',
};
const DEFAULT_SECTOR_COLOR = '#fff';

const L1_ORDER = ['A股', '海外新兴', '货币', '海外成熟', '债券'] as const;

/** l1Category: 当前所属一级分类；写入 category 供 colorField 使用 */
function toChartData(node: SunburstNode, l1Category?: string): ChartNode {
  const pctValue = parsePct(node.percentage);
  const value = pctValue || node.shares || 0;
  const category = l1Category ?? node.name;
  const out: ChartNode = {
    name: node.name,
    value,
    category,
    shares: node.shares,
    percentage: node.percentage ?? (pctValue ? `${pctValue.toFixed(2)}%` : undefined),
  };
  if (node.children?.length) {
    out.children = node.children.map((c) => toChartData(c, category));
  }
  return out;
}

const CHART_MIN_SIZE = 280;
const CHART_MAX_HEIGHT = 900;

export default function SunburstPage() {
  const [data, setData] = useState<ChartNode[] | null>(null);
  const [meta, setMeta] = useState<{ name?: string; date?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? {};
      if (width != null && height != null) {
        const w = Math.max(CHART_MIN_SIZE, Math.floor(width));
        const h = Math.max(CHART_MIN_SIZE, Math.min(CHART_MAX_HEIGHT, Math.floor(height)));
        setChartSize({ width: w, height: h });
      }
    });
    ro.observe(el);
    const { width, height } = el.getBoundingClientRect();
    if (width && height) {
      setChartSize({
        width: Math.max(CHART_MIN_SIZE, Math.floor(width)),
        height: Math.max(CHART_MIN_SIZE, Math.min(CHART_MAX_HEIGHT, Math.floor(height))),
      });
    }
    return () => ro.disconnect();
  }, [data != null]);

  useEffect(() => {
    fetch('/api/chart/position-distribution')
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((body: { name?: string; date?: string; children?: SunburstNode[] }) => {
        setMeta({ name: body.name, date: body.date });
        const children = body.children ?? [];
        const chartData = children.map(toChartData);
        setData(chartData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="sunburst-page sunburst-page--loading">
        <p>加载中…</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="sunburst-page sunburst-page--error">
        <p>{error ?? '暂无数据'}</p>
      </div>
    );
  }

  // G2 plot.js does: data = Array.isArray(data) ? data : data.value — so the mark receives data.value.
  // So we must pass { value: root } where root = { name, value, children }. Then the mark gets the full tree and labels work.
  const rootData = { name: 'root', value: 100, children: data };

  const formatTooltipLabel = (d: any): string => {
    if (!d) return '—';
    const raw = d?.data?.data ?? d?.data ?? d;
    const name = raw?.name ?? d?.name ?? '—';
    const value = Number(raw?.value ?? d?.value ?? 0);
    const shares = raw?.shares ?? d?.shares;
    const percentage = raw?.percentage ?? d?.percentage;
    const pctText =
      typeof percentage === 'string'
        ? percentage
        : Number.isFinite(value)
          ? `${value.toFixed(2)}%`
          : '';
    const sharesText = shares != null ? ` [${shares}]` : '';
    return `${name}${sharesText} ${pctText}`.trim() || '—';
  };

  const getLabelText = (d: any): string => {
    const name = d?.data?.name ?? d?.name;
    if (!name || name === 'root') return '';
    const shares = d?.data?.shares ?? d?.shares;
    const percentage = d?.data?.percentage ?? d?.percentage;
    const value = Number(d?.data?.value ?? d?.value ?? 0);
    const pctText =
      typeof percentage === 'string'
        ? percentage
        : Number.isFinite(Number(percentage))
          ? `${Number(percentage).toFixed(2)}%`
          : '';
    // 旭日图标签：name 与 percentage 换行展示
    if (shares != null && pctText) return `${name}\n[${shares}] ${pctText}`;
    if (shares != null) return `${name}\n[${shares}]`;
    if (pctText) return `${name}\n${pctText}`;
    return String(name);
  };

  // 挂到全局，避免 @ant-design/plots 的 processConfig 把回调当 React 工厂包装（否则会 createNode 返回 div 导致 React 报错）
  if (typeof window !== 'undefined') {
    (window as any).__sunburstFormat = formatTooltipLabel;
    (window as any).__sunburstLabel = getLabelText;
  }

  const L1_COLORS = L1_ORDER.map((name) => L1_COLOR_MAP[name] ?? DEFAULT_SECTOR_COLOR);
  const config = {
    data: { value: rootData },
    width: chartSize.width,
    height: chartSize.height,
    innerRadius: 0.22,
    radius: 0.9,
    colorField: 'category',
    color: L1_COLORS,
    scale: {
      category: { domain: [...L1_ORDER], range: L1_COLORS },
      color: { domain: [...L1_ORDER], range: L1_COLORS },
    },
    legend: false as const,
    hierarchyConfig: {
      field: 'value',
    },
    labels: [
      {
        text: new Function(
          'd',
          'var f=typeof window!=="undefined"&&window.__sunburstLabel;return f?f(d):"";'
        ) as (d: unknown) => string,
        style: {
          fill: 'white',
          fontSize: 10,
          fontWeight: 500,
          lineHeight: 13,
          textAlign: 'center',
        },
      },
    ],
    tooltip: {
      title: new Function(
        'd',
        'var f=typeof window!=="undefined"&&window.__sunburstFormat;try{var x=Array.isArray(d)?d[0]:d;return f?f(x):"\u2014";}catch(e){return "\u2014";}'
      ) as (d: any) => string,
      items: new Function('return [];') as () => { name: string; value: string }[],
    },
    sunburstStyle: {
      stroke: '#fff',
      lineWidth: 1.5,
    },
    style: {
      fillOpacity: 1,
    },
  };

  return (
    <div className="sunburst-page sunburst-page--light">
      {meta?.name && (
        <header className="sunburst-header">
          <h1 className="sunburst-title">{meta.name}</h1>
          {meta.date && <span className="sunburst-date">{meta.date}</span>}
        </header>
      )}
      <div className="sunburst-chart-wrap" ref={chartWrapRef}>
        <Sunburst {...config} />
      </div>
    </div>
  );
}
