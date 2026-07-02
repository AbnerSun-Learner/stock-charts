import { calculateGridStrategy } from '@/lib/grid-calculator';
import type { GridParams, GridRow, StressTest } from '@/types/grid';
import type { GridParamsValidation } from '@/lib/grid-validate-params';

export interface GridRunOptions {
  dynamicGridEnabled: boolean;
  dynamicGridMode: 'stable' | 'aggressive';
}

export interface GridRunResult {
  gridData: GridRow[];
  stressTest: StressTest | null;
}

/**
 * 执行网格计算：校验失败时返回空结果，与页面「生成策略」行为一致。
 */
export function runGridCalculation(
  params: GridParams,
  options: GridRunOptions,
  validation: GridParamsValidation
): GridRunResult {
  if (!validation.isValid) {
    return { gridData: [], stressTest: null };
  }

  return calculateGridStrategy(params, options);
}
