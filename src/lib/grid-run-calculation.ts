import type { GridParams } from '@/types/grid';
import { calculateGridStrategyV2 } from '@/lib/grid/grid-strategy';
import { adaptV2Result } from '@/lib/grid/legacy-adapter';
import type { AggregatedGridRow, GridLeg, GridStrategyState, StrategyWarning } from '@/types/grid-v2';
import {
  validateGeneratedLegs,
  type GridParamsValidation,
} from '@/lib/grid-validate-params';
import type { GridRow, StressTest } from '@/types/grid';

export interface GridRunOptions {
  dynamicGridEnabled: boolean;
  dynamicGridMode: 'stable' | 'aggressive';
  currentPrice?: number;
}

export interface GridRunResult {
  gridData: GridRow[];
  stressTest: StressTest | null;
  legs: GridLeg[];
  aggregatedRows: AggregatedGridRow[];
  amountPerGrid: number;
  warnings: StrategyWarning[];
  state: GridStrategyState | null;
  /** 计算后硬错误（如 E13 无有效档位） */
  calculationErrors: string[];
}

/**
 * 执行网格计算：参数校验或计算后校验失败时返回空结果与明确错误。
 */
export function runGridCalculation(
  params: GridParams,
  options: GridRunOptions,
  validation: GridParamsValidation
): GridRunResult {
  const emptyResult = (
    overrides: Partial<GridRunResult> = {}
  ): GridRunResult => ({
    gridData: [],
    stressTest: null,
    legs: [],
    aggregatedRows: [],
    amountPerGrid: 0,
    warnings: [],
    state: null,
    calculationErrors: [],
    ...overrides,
  });

  if (!validation.isValid) {
    return emptyResult();
  }

  const v2Result = calculateGridStrategyV2(params, {
    dynamicGridEnabled: options.dynamicGridEnabled,
    dynamicGridMode: options.dynamicGridMode,
    currentPrice: options.currentPrice,
  });
  const legValidation = validateGeneratedLegs(v2Result.legs.length);

  if (!legValidation.isValid) {
    return emptyResult({
      amountPerGrid: v2Result.amountPerGrid,
      warnings: v2Result.warnings,
      state: v2Result.state,
      calculationErrors: legValidation.errors,
    });
  }

  const adapted = adaptV2Result(v2Result, params);

  return {
    gridData: adapted.gridData,
    stressTest: adapted.stressTest,
    legs: v2Result.legs,
    aggregatedRows: adapted.aggregatedRows,
    amountPerGrid: adapted.amountPerGrid,
    warnings: adapted.warnings,
    state: adapted.state,
    calculationErrors: [],
  };
}
