'use client';

import { ErrorAlert } from '@/components/grid/error-alert';
import type { MarketApiResponse } from '@/types/market';
import { DataFreshnessBadge } from './data-freshness-badge';

interface MarketDataPanelProps<T> {
  title: string;
  response: MarketApiResponse<T> | null;
  error: string | null;
  loading?: boolean;
  children?: React.ReactNode;
}

/** 市场数据加载态：错误、新鲜度、内容 */
export function MarketDataPanel<T>({
  title,
  response,
  error,
  loading = false,
  children,
}: MarketDataPanelProps<T>) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">
        正在加载{title}…
      </div>
    );
  }

  if (error) {
    return (
      <ErrorAlert
        errors={[error]}
        title={`${title}不可用`}
      />
    );
  }

  if (!response) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--ds-shadow-sm)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {title}
        </h3>
        <DataFreshnessBadge meta={response} />
      </div>
      {response.warnings.length > 0 ? (
        <ul className="mb-3 list-inside list-disc text-xs text-[color-mix(in_srgb,var(--warning,#f59e0b)_80%,var(--foreground))]">
          {response.warnings.map(w => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      {children}
    </div>
  );
}
