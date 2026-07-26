'use client';

import { HelpTooltip } from '@/components/shared/help-tooltip';
import {
  buildPrimaryKpis,
} from '@/components/grid/build-primary-kpis';
import type { StressTest } from '@/types/grid';

interface GridPrimaryKpiRowProps {
  stressTest: StressTest;
}

/**
 * 结果态顶部主 KPI 行。
 */
export function GridPrimaryKpiRow({ stressTest }: GridPrimaryKpiRowProps) {
  const items = buildPrimaryKpis(stressTest);

  return (
    <div
      id="grid-primary-kpis"
      className="grid grid-cols-2 gap-3 md:grid-cols-4"
    >
      {items.map(item => (
        <div
          key={item.label}
          className="grid-card grid-card--compact p-4 md:p-5"
        >
          <div className="mb-3 flex items-center gap-1">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              {item.label}
            </span>
            {item.tooltip ? (
              <HelpTooltip
                title={item.tooltip}
                placement="topLeft"
                maxWidth="13rem"
              />
            ) : null}
          </div>
          <div
            className="text-2xl font-light tabular-nums tracking-[-0.02em]"
            style={{ color: item.color ?? 'var(--foreground)' }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
