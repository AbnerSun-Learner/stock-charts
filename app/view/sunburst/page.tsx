'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { message } from 'antd';
import type { WindowWithSunburst } from '@/types/sunburst';
import { parseConfigJson, type ConfigBody, type SunburstNode } from './parse-config-json';

const Sunburst = dynamic(
  () => import('@ant-design/charts').then((mod) => mod.Sunburst),
  { ssr: false }
);

interface ChartNode {
  name: string;
  value: number;
  category?: string;
  shares?: number;
  percentage?: string;
  children?: ChartNode[];
}

/** 图表库 tooltip/label 回调传入的 datum 结构（可能有一层或两层 data 嵌套） */
interface ChartDatumPayload {
  data?: ChartDatumPayload | { name?: string; value?: number; shares?: number; percentage?: string };
  name?: string;
  value?: number;
  shares?: number;
  percentage?: string;
}

function getPayloadRaw(payload: ChartDatumPayload): ChartDatumPayload | Record<string, unknown> {
  const inner = payload?.data;
  if (inner && typeof inner === 'object' && 'data' in inner) return (inner as ChartDatumPayload).data ?? inner;
  return inner ?? payload;
}

function parsePct(p: string | number | undefined): number {
  if (typeof p === 'number') return p;
  if (typeof p === 'string') return parseFloat(p.replace('%', '')) || 0;
  return 0;
}

const L1_COLOR_MAP: Record<string, string> = {
  A股: '#7c9cb5',
  货币: '#2d8fb3',
  海外新兴: '#e89a7d',
  债券: '#3db5dc',
  海外成熟: '#2ca89e',
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

const CHART_MIN_SIZE = 280;
const CHART_MAX_HEIGHT = 900;

/** 配置区按钮基础样式（模块级常量，避免每轮渲染重复创建） */
const SUNBURST_BTN_BASE =
  'py-2 px-4 font-[var(--font-body)] text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg cursor-pointer transition-all duration-150 hover:bg-[var(--bg-sidebar-hover)] hover:border-[var(--border-muted)] hover:text-[var(--text-primary)] active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed';
const SUNBURST_BTN_PRIMARY =
  'bg-[var(--accent)] text-white border-[var(--accent)] hover:!bg-[var(--text-accent-soft)] hover:!border-[var(--text-accent-soft)] hover:!text-white';

// 导出图片文件名常量
const EXPORT_FILE_PREFIX = '资产配置-';
const EXPORT_FILE_EXT = '.png';

/**
 * 格式化日期为 YYYYMMDD 字符串
 */
function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * 旭日图配置与图表页面：支持上传/编辑 JSON、生成图表并导出配置与 PNG。
 */
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

  // 使用固定文件名格式，不再依赖 meta 数据
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
      const dateStr = formatDateYYYYMMDD(new Date());
      const a = document.createElement('a');
      a.href = url;
      a.download = `${EXPORT_FILE_PREFIX}${dateStr}${EXPORT_FILE_EXT}`;
      a.click();
      message.success('图片已下载');
    } catch {
      message.error('下载失败，请重试');
    }
  }, []);

  const formatTooltipLabel = useCallback((d: unknown): string => {
    if (!d || typeof d !== 'object') return '—';
    const payload = d as ChartDatumPayload;
    const raw = getPayloadRaw(payload);
    const name = (raw && typeof raw === 'object' && 'name' in raw ? (raw as ChartDatumPayload).name : payload?.name) ?? '—';
    const value = Number((raw && typeof raw === 'object' && 'value' in raw ? (raw as ChartDatumPayload).value : payload?.value) ?? 0);
    const shares = (raw && typeof raw === 'object' && 'shares' in raw ? (raw as ChartDatumPayload).shares : payload?.shares) ?? undefined;
    const percentage = (raw && typeof raw === 'object' && 'percentage' in raw ? (raw as ChartDatumPayload).percentage : payload?.percentage) ?? undefined;
    const pctText = typeof percentage === 'string' ? percentage : Number.isFinite(value) ? `${value.toFixed(2)}%` : '';
    const sharesText = shares != null ? ` [${shares}]` : '';
    return `${String(name)}${sharesText} ${pctText}`.trim() || '—';
  }, []);

  const getLabelText = useCallback((d: unknown): string => {
    const payload = d as ChartDatumPayload;
    const raw = getPayloadRaw(payload);
    const name = (raw && typeof raw === 'object' && 'name' in raw ? (raw as ChartDatumPayload).name : payload?.name) ?? '';
    if (!name || name === 'root') return '';
    const shares = (raw && typeof raw === 'object' && 'shares' in raw ? (raw as ChartDatumPayload).shares : payload?.shares) ?? undefined;
    const percentage = (raw && typeof raw === 'object' && 'percentage' in raw ? (raw as ChartDatumPayload).percentage : payload?.percentage) ?? undefined;
    const value = Number((raw && typeof raw === 'object' && 'value' in raw ? (raw as ChartDatumPayload).value : payload?.value) ?? 0);
    const pctText = typeof percentage === 'string' ? percentage : Number.isFinite(Number(percentage)) ? `${Number(percentage).toFixed(2)}%` : '';
    if (shares != null && pctText) return `${name}\n[${shares}] ${pctText}`;
    if (shares != null) return `${name}\n[${shares}]`;
    if (pctText) return `${name}\n${pctText}`;
    return String(name);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as WindowWithSunburst;
      win.__sunburstFormat = formatTooltipLabel;
      win.__sunburstLabel = getLabelText;
      return () => {
        delete win.__sunburstFormat;
        delete win.__sunburstLabel;
      };
    }
  }, [formatTooltipLabel, getLabelText]);

  const L1_COLORS = L1_ORDER.map((name) => L1_COLOR_MAP[name] ?? DEFAULT_SECTOR_COLOR);

  return (
    <div className="sunburst-page min-h-[60vh] flex flex-col text-[var(--text-primary)]">
      <section
        className="mb-6 py-5 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl"
        aria-label="配置区"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <label className="font-[var(--font-body)] text-[0.8125rem] font-semibold text-[var(--text-secondary)] shrink-0">
              操作区域
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="absolute w-0 h-0 opacity-0 pointer-events-none"
                aria-label="选择 JSON 文件"
              />
              <button type="button" className={SUNBURST_BTN_BASE} onClick={() => fileInputRef.current?.click()}>
                上传 JSON
              </button>
              <button type="button" className={SUNBURST_BTN_BASE} onClick={handleGenerateChart}>
                生成图表
              </button>
              <button
                type="button"
                className={SUNBURST_BTN_BASE}
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
              <button type="button" className={SUNBURST_BTN_BASE} onClick={handleDownloadPng} disabled={!chartData?.length}>
                下载 PNG
              </button>
            </div>
          </div>
          {configError && (
            <p className="m-0 text-[0.8125rem] text-red-600" role="alert">
              {configError}
            </p>
          )}
        </div>

        {showJsonPanel && (
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex flex-col gap-2">
            <label className="font-[var(--font-body)] text-[0.8125rem] font-semibold text-[var(--text-secondary)] shrink-0">
              当前 JSON 配置
            </label>
            <textarea
              className="w-full min-h-[200px] py-3 px-4 font-mono text-[0.8125rem] leading-normal text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg resize-y focus:outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]"
              value={jsonPanelText}
              onChange={(e) => setJsonPanelText(e.target.value)}
              placeholder='{"name":"资产配置","date":"","children":[...]}'
              spellCheck={false}
              rows={12}
            />
            <div className="flex flex-wrap gap-2 items-center mt-3">
              <button type="button" className={SUNBURST_BTN_BASE} onClick={handleExportConfig}>
                导出当前配置
              </button>
              <button type="button" className={`${SUNBURST_BTN_BASE} ${SUNBURST_BTN_PRIMARY}`} onClick={handleApplyConfig}>
                应用配置
              </button>
            </div>
          </div>
        )}
      </section>

      {configError && !showJsonPanel && (
        <p className="m-0 mb-4 text-[0.8125rem] text-red-600" role="alert">
          {configError}
        </p>
      )}

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
        <div className="flex-1 flex items-center justify-center min-h-[min(360px,50vh)] p-8 bg-[var(--bg-card)] border border-dashed border-[var(--border-muted)] rounded-2xl">
          <p className="m-0 text-[0.9375rem] text-[var(--text-muted)] text-center max-w-[36ch]">
            请上传与 position_distribution.json 格式一致的 JSON 文件，然后点击「生成图表」。
          </p>
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
        text: (d: unknown): string => {
          const win = typeof window !== 'undefined' ? (window as WindowWithSunburst) : undefined;
          return win?.__sunburstLabel ? win.__sunburstLabel(d) : '';
        },
        style: { fill: 'white', fontSize: 10, fontWeight: 500, lineHeight: 13, textAlign: 'center' as const },
      },
    ],
    tooltip: {
      title: (d: unknown): string => {
        const win = typeof window !== 'undefined' ? (window as WindowWithSunburst) : undefined;
        try {
          const x = Array.isArray(d) ? d[0] : d;
          return win?.__sunburstFormat ? win.__sunburstFormat(x) : '—';
        } catch {
          return '—';
        }
      },
      items: (): { name: string; value: string }[] => [],
    },
    sunburstStyle: { stroke: '#fff', lineWidth: 1.5 },
    style: { fillOpacity: 1 },
  };

  return (
    <>
      {meta?.name && (
        <header className="mb-7 animate-[viewFadeIn_0.6s_var(--ease-out-expo)_both]">
          <h1 className="font-[var(--font-display)] text-[1.75rem] font-semibold tracking-tight text-[var(--text-primary)] m-0 mb-1">
            {meta.name}
          </h1>
          {meta.date && (
            <span className="text-sm text-[var(--text-muted)] font-medium">{meta.date}</span>
          )}
        </header>
      )}
      <div
        className="sunburst-chart-wrap flex-1 min-h-[min(360px,80vh)] max-h-[900px] h-[min(85vh,900px)] bg-[var(--bg-card)] rounded-2xl p-3 border border-[var(--border-subtle)] shadow-[var(--shadow-elevated)] animate-[viewFadeIn_0.6s_var(--ease-out-expo)_0.08s_both] flex items-center justify-center overflow-hidden focus-within:border-[var(--border-focus)] focus-within:shadow-[var(--shadow-elevated),0_0_0_1px_var(--border-focus)]"
        ref={chartWrapRef}
      >
        <Sunburst {...config} />
      </div>
    </>
  );
}
