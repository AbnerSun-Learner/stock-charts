'use client';

import type { MarketApiResponse } from '@/types/market';

interface DataFreshnessBadgeProps {
  meta: Pick<
    MarketApiResponse<unknown>,
    'source' | 'timestamp' | 'stale' | 'fallbackUsed'
  >;
  className?: string;
}

/** 展示 API 数据新鲜度与来源 */
export function DataFreshnessBadge({
  meta,
  className = '',
}: DataFreshnessBadgeProps) {
  const timeLabel = new Date(meta.timestamp).toLocaleString('zh-CN', {
    hour12: false,
  });

  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-xs text-[color-mix(in_srgb,var(--foreground)_70%,transparent)] ${className}`}
      data-testid="data-freshness-badge"
    >
      <span>
        数据源：
        <strong className="font-medium text-[var(--foreground)]">
          {meta.source}
        </strong>
      </span>
      <span>更新时间：{timeLabel}</span>
      {meta.stale ? (
        <span className="rounded-full bg-[color-mix(in_srgb,var(--warning,#f59e0b)_15%,transparent)] px-2 py-0.5 text-[var(--warning,#f59e0b)]">
          数据过期
        </span>
      ) : (
        <span className="rounded-full bg-[color-mix(in_srgb,var(--gain)_12%,transparent)] px-2 py-0.5 text-[var(--gain)]">
          新鲜
        </span>
      )}
      {meta.fallbackUsed ? (
        <span className="rounded-full bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] px-2 py-0.5">
          已降级
        </span>
      ) : null}
    </div>
  );
}
