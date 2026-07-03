'use client';

import {
  computeAtr20,
  computeReturnCorrelation,
} from '@/lib/indicators';
import {
  isMarketApiResponseOk,
  type EtfKlineData,
  type MarketApiResponse,
} from '@/types/market';
import { useCallback, useEffect, useState } from 'react';
import { MarketDataPanel } from '@/components/market/market-data-panel';

interface EtfIndicatorPreviewProps {
  /** 6 位 ETF 代码；为空时不渲染、不请求 */
  symbol?: string;
  exchange?: 'SSE' | 'SZSE';
  benchmarkSymbol?: string;
}

interface IndicatorPreview {
  atr20Pct: number | null;
  corr90: number | null;
}

/**
 * 标的指标预览（Phase 3 筛选页使用）。
 * 需由用户选定 ETF 后再传入 symbol，禁止在网格计算器页硬编码默认标的。
 */
export function EtfIndicatorPreview({
  symbol,
  exchange = 'SSE',
  benchmarkSymbol = '510500',
}: EtfIndicatorPreviewProps) {
  const normalizedSymbol = symbol?.replace(/\D/g, '') ?? '';
  const [response, setResponse] =
    useState<MarketApiResponse<EtfKlineData> | null>(null);
  const [benchmarkResponse, setBenchmarkResponse] =
    useState<MarketApiResponse<EtfKlineData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [indicators, setIndicators] = useState<IndicatorPreview>({
    atr20Pct: null,
    corr90: null,
  });

  const loadData = useCallback(async () => {
    if (normalizedSymbol.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        symbol: normalizedSymbol,
        exchange,
      });
      const benchParams = new URLSearchParams({
        symbol: benchmarkSymbol,
        exchange: 'SSE',
      });

      const [mainRes, benchRes] = await Promise.all([
        fetch(`/api/market/etf-kline?${params}`),
        fetch(`/api/market/etf-kline?${benchParams}`),
      ]);

      const mainJson =
        (await mainRes.json()) as MarketApiResponse<EtfKlineData>;
      const benchJson =
        (await benchRes.json()) as MarketApiResponse<EtfKlineData>;

      if (!mainRes.ok || !isMarketApiResponseOk(mainJson)) {
        setError(mainJson.warnings.join('；') || 'K 线数据不可用');
        setResponse(mainJson);
        return;
      }

      setResponse(mainJson);
      setBenchmarkResponse(
        benchRes.ok && isMarketApiResponseOk(benchJson) ? benchJson : null
      );

      const bars = mainJson.data.bars;
      const highs = bars.map(b => b.high);
      const lows = bars.map(b => b.low);
      const closes = bars.map(b => b.close);

      const atr = computeAtr20(highs, lows, closes);
      let corr90: number | null = null;
      if (isMarketApiResponseOk(benchJson)) {
        corr90 = computeReturnCorrelation(
          bars.map(b => ({ date: b.date, close: b.close })),
          benchJson.data.bars.map(b => ({ date: b.date, close: b.close })),
          90
        );
      }

      setIndicators({
        atr20Pct: atr?.atrPct ?? null,
        corr90,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [normalizedSymbol, exchange, benchmarkSymbol]);

  useEffect(() => {
    if (normalizedSymbol.length === 0) return;
    void loadData();
  }, [loadData, normalizedSymbol]);

  if (normalizedSymbol.length === 0) return null;

  return (
    <MarketDataPanel
      title={`${normalizedSymbol} 指标预览`}
      response={response}
      error={error}
      loading={loading}
    >
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
            ATR20%
          </dt>
          <dd className="font-semibold tabular-nums text-[var(--foreground)]">
            {indicators.atr20Pct !== null
              ? `${indicators.atr20Pct.toFixed(2)}%`
              : '数据不足'}
          </dd>
        </div>
        <div>
          <dt className="text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
            90 日相关（vs {benchmarkSymbol}）
          </dt>
          <dd className="font-semibold tabular-nums text-[var(--foreground)]">
            {indicators.corr90 !== null
              ? indicators.corr90.toFixed(3)
              : benchmarkResponse
                ? '数据不足'
                : '基准不可用'}
          </dd>
        </div>
        <div>
          <dt className="text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
            K 线样本
          </dt>
          <dd className="font-semibold tabular-nums text-[var(--foreground)]">
            {response && isMarketApiResponseOk(response)
              ? `${response.data.bars.length} 根`
              : '—'}
          </dd>
        </div>
      </dl>
    </MarketDataPanel>
  );
}
