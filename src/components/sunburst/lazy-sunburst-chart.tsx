'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps, ComponentType } from 'react';
import type { SunburstChart } from '@/components/sunburst/sunburst-chart';

/**
 * 图表库体积大，仅在生成图表后按需加载，避免进入页面首包与 SSR vendor chunk。
 */
export const LazySunburstChart = dynamic(
  () =>
    import('@/components/sunburst/sunburst-chart').then(mod => ({
      default: mod.SunburstChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[min(360px,50vh)] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border-muted)] bg-[var(--bg-card)] p-8">
        <div
          className="h-9 w-9 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
          aria-hidden
        />
        <p className="m-0 text-sm font-medium text-[var(--text-muted)]">加载图表…</p>
      </div>
    ),
  }
) as ComponentType<ComponentProps<typeof SunburstChart>>;
