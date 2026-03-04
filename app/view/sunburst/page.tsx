'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sunburst } from '@ant-design/charts';
import { message } from 'antd';

interface SunburstNode {
  name: string;
  shares?: number;
  percentage?: string;
  children?: SunburstNode[];
}

interface ChartNode {
  name: string;
  value: number;
  category?: string;
  shares?: number;
  percentage?: string;
  children?: ChartNode[];
}

type ConfigBody = { name?: string; date?: string; children?: SunburstNode[] };

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

function parseConfigJson(raw: string): { ok: true; body: ConfigBody } | { ok: false; error: string } {
  try {
    const json = JSON.parse(raw) as unknown;
    if (!json || typeof json !== 'object') return { ok: false, error: '无效的 JSON' };
    const body = json as Record<string, unknown>;
    if (!Array.isArray(body.children)) return { ok: false, error: '缺少 children 数组，格式需与 position_distribution.json 一致' };
    return { ok: true, body: { name: String(body.name ?? ''), date: body.date != null ? String(body.date) : undefined, children: body.children as SunburstNode[] } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '解析失败' };
  }
}

const CHART_MIN_SIZE = 280;
const CHART_MAX_HEIGHT = 900;

export default function SunburstPage() {
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartNode[] | null>(null);
  const [meta, setMeta] = useState<{ name?: string; date?: string } | null>(null);
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [jsonPanelText, setJsonPanelText] = useState('');
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ width: 800, height: 600 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setConfigError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setRawJson(text);
      setJsonPanelText(text);
      const parsed = parseConfigJson(text);
      if (parsed.ok) {
        message.success('上传成功，可点击「生成图表」');
      } else {
        setConfigError(parsed.error);
        message.error(`解析失败：${parsed.error}`);
      }
    };
    reader.onerror = () => {
      message.error('文件读取失败，请重试');
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }, []);

  const handleGenerateChart = useCallback(() => {
    const text = rawJson ?? jsonPanelText;
    if (!text?.trim()) {
      message.error('请先上传 JSON 文件');
      setConfigError('请先上传 JSON 文件');
      return;
    }
    const parsed = parseConfigJson(text);
    if (!parsed.ok) {
      message.error(parsed.error);
      setConfigError(parsed.error);
      return;
    }
    setConfigError(null);
    setMeta({ name: parsed.body.name, date: parsed.body.date });
    const children = parsed.body.children ?? [];
    setChartData(children.map((c) => toChartData(c)));
    message.success('图表已生成');
  }, [rawJson, jsonPanelText]);

  const handleExportConfig = useCallback(() => {
    const text = rawJson ?? jsonPanelText;
    if (!text?.trim()) {
      message.error('暂无配置可导出，请先上传或粘贴 JSON');
      return;
    }
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'position_distribution.json';
      a.click();
      URL.revokeObjectURL(url);
      message.success('配置已导出为 position_distribution.json');
    } catch {
      message.error('导出失败，请重试');
    }
  }, [rawJson, jsonPanelText]);

  const handleApplyConfig = useCallback(() => {
    const text = jsonPanelText.trim();
    if (!text) {
      message.error('请输入或粘贴 JSON 配置');
      setConfigError('请输入或粘贴 JSON 配置');
      return;
    }
    const parsed = parseConfigJson(text);
    if (!parsed.ok) {
      message.error(parsed.error);
      setConfigError(parsed.error);
      return;
    }
    setConfigError(null);
    setRawJson(text);
    message.success('配置已应用，可点击「生成图表」更新图表');
  }, [jsonPanelText]);

  const handleDownloadPng = useCallback(() => {
    const wrap = chartWrapRef.current;
    if (!wrap) {
      message.error('图表区域未就绪，请重试');
      return;
    }
    const canvas = wrap.querySelector('canvas');
    if (!canvas) {
      message.error('请先生成图表后再下载');
      return;
    }
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `sunburst-${meta?.name ?? 'chart'}-${meta?.date ?? ''}.png`.replace(/\s+/g, '-') || 'sunburst.png';
      a.click();
      message.success('图片已下载');
    } catch {
      message.error('下载失败，请重试');
    }
  }, [meta?.name, meta?.date]);

  const formatTooltipLabel = useCallback((d: unknown): string => {
    if (!d || typeof d !== 'object') return '—';
    const raw = (d as any)?.data?.data ?? (d as any)?.data ?? d;
    const name = raw?.name ?? (d as any)?.name ?? '—';
    const value = Number(raw?.value ?? (d as any)?.value ?? 0);
    const shares = raw?.shares ?? (d as any)?.shares;
    const percentage = raw?.percentage ?? (d as any)?.percentage;
    const pctText = typeof percentage === 'string' ? percentage : Number.isFinite(value) ? `${value.toFixed(2)}%` : '';
    const sharesText = shares != null ? ` [${shares}]` : '';
    return `${name}${sharesText} ${pctText}`.trim() || '—';
  }, []);

  const getLabelText = useCallback((d: unknown): string => {
    const name = (d as any)?.data?.name ?? (d as any)?.name;
    if (!name || name === 'root') return '';
    const shares = (d as any)?.data?.shares ?? (d as any)?.shares;
    const percentage = (d as any)?.data?.percentage ?? (d as any)?.percentage;
    const value = Number((d as any)?.data?.value ?? (d as any)?.value ?? 0);
    const pctText = typeof percentage === 'string' ? percentage : Number.isFinite(Number(percentage)) ? `${Number(percentage).toFixed(2)}%` : '';
    if (shares != null && pctText) return `${name}\n[${shares}] ${pctText}`;
    if (shares != null) return `${name}\n[${shares}]`;
    if (pctText) return `${name}\n${pctText}`;
    return String(name);
  }, []);

  if (typeof window !== 'undefined') {
    (window as any).__sunburstFormat = formatTooltipLabel;
    (window as any).__sunburstLabel = getLabelText;
  }

  const L1_COLORS = L1_ORDER.map((name) => L1_COLOR_MAP[name] ?? DEFAULT_SECTOR_COLOR);

  return (
    <div className="sunburst-page sunburst-page--light">
      <section className="sunburst-config" aria-label="配置区">
        <div className="sunburst-config-inner">
          <div className="sunburst-config-row">
            <label className="sunburst-config-label">操作区域</label>
            <div className="sunburst-config-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="sunburst-config-file-input"
                aria-label="选择 JSON 文件"
              />
              <button
                type="button"
                className="sunburst-config-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                上传 JSON
              </button>
              <button type="button" className="sunburst-config-btn sunburst-config-btn--primary" onClick={handleGenerateChart}>
                生成图表
              </button>
              <button
                type="button"
                className="sunburst-config-btn"
                onClick={() => {
                  setShowJsonPanel((p) => {
                    const next = !p;
                    message.success(next ? '已显示 JSON 配置' : '已隐藏 JSON 配置');
                    return next;
                  });
                  if (!showJsonPanel) setJsonPanelText(rawJson ?? '');
                }}
              >
                {showJsonPanel ? '隐藏 JSON 配置' : '显示 JSON 配置'}
              </button>
              <button type="button" className="sunburst-config-btn" onClick={handleDownloadPng} disabled={!chartData?.length}>
                下载 PNG
              </button>
            </div>
          </div>
          {configError && (
            <p className="sunburst-config-error" role="alert">
              {configError}
            </p>
          )}
        </div>

        {showJsonPanel && (
          <div className="sunburst-json-panel">
            <label className="sunburst-config-label">当前 JSON 配置</label>
            <textarea
              className="sunburst-json-textarea"
              value={jsonPanelText}
              onChange={(e) => setJsonPanelText(e.target.value)}
              placeholder='{"name":"资产配置","date":"","children":[...]}'
              spellCheck={false}
              rows={12}
            />
            <div className="sunburst-config-actions sunburst-config-actions--panel">
              <button type="button" className="sunburst-config-btn" onClick={handleExportConfig}>
                导出当前配置
              </button>
              <button type="button" className="sunburst-config-btn sunburst-config-btn--primary" onClick={handleApplyConfig}>
                应用配置
              </button>
            </div>
          </div>
        )}
      </section>

      {configError && !showJsonPanel && <p className="sunburst-config-error sunburst-config-error--standalone">{configError}</p>}

      {chartData?.length ? (
        <SunburstChartBlock
          chartData={chartData}
          meta={meta}
          chartWrapRef={chartWrapRef}
          chartSize={chartSize}
          setChartSize={setChartSize}
          L1_COLORS={L1_COLORS}
        />
      ) : (
        <div className="sunburst-empty">
          <p>请上传与 position_distribution.json 格式一致的 JSON 文件，然后点击「生成图表」。</p>
        </div>
      )}
    </div>
  );
}

function SunburstChartBlock({
  chartData,
  meta,
  chartWrapRef,
  chartSize,
  setChartSize,
  L1_COLORS,
}: {
  chartData: ChartNode[];
  meta: { name?: string; date?: string } | null;
  chartWrapRef: React.RefObject<HTMLDivElement>;
  chartSize: { width: number; height: number };
  setChartSize: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
  L1_COLORS: string[];
}) {
  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? {};
      if (width != null && height != null) {
        setChartSize({
          width: Math.max(CHART_MIN_SIZE, Math.floor(width)),
          height: Math.max(CHART_MIN_SIZE, Math.min(CHART_MAX_HEIGHT, Math.floor(height))),
        });
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
  }, [chartWrapRef, setChartSize]);

  const rootData = { name: 'root', value: 100, children: chartData };

  const config = {
    data: { value: rootData },
    width: chartSize.width,
    height: chartSize.height,
    innerRadius: 0.22,
    radius: 0.9,
    colorField: 'category' as const,
    color: L1_COLORS,
    scale: {
      category: { domain: [...L1_ORDER], range: L1_COLORS },
      color: { domain: [...L1_ORDER], range: L1_COLORS },
    },
    legend: false as const,
    hierarchyConfig: { field: 'value' as const },
    labels: [
      {
        text: new Function('d', 'var f=typeof window!=="undefined"&&window.__sunburstLabel;return f?f(d):"";') as (d: unknown) => string,
        style: { fill: 'white', fontSize: 10, fontWeight: 500, lineHeight: 13, textAlign: 'center' as const },
      },
    ],
    tooltip: {
      title: new Function('d', 'var f=typeof window!=="undefined"&&window.__sunburstFormat;try{var x=Array.isArray(d)?d[0]:d;return f?f(x):"\u2014";}catch(e){return "\u2014";}') as (d: unknown) => string,
      items: (() => []) as () => { name: string; value: string }[],
    },
    sunburstStyle: { stroke: '#fff', lineWidth: 1.5 },
    style: { fillOpacity: 1 },
  };

  return (
    <>
      {meta?.name && (
        <header className="sunburst-header">
          <h1 className="sunburst-title">{meta.name}</h1>
          {meta.date && <span className="sunburst-date">{meta.date}</span>}
        </header>
      )}
      <div className="sunburst-chart-wrap" ref={chartWrapRef}>
        <Sunburst {...config} />
      </div>
    </>
  );
}
