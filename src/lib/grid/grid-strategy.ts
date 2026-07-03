import type {
  CalculateGridStrategyV2Result,
  GridStrategyOptionsV2,
  GridStrategyParamsV2,
} from '@/types/grid-v2';
import { aggregateGridLegs } from '@/lib/grid/aggregation';
import {
  generateLegsWithAmount,
  resolveAmountPerGrid,
} from '@/lib/grid/capital-allocation';
import { computeStressTestV2 } from '@/lib/grid/stress-test';
import { resolveGridStrategyState } from '@/lib/grid/state-machine';
import { buildStrategyWarnings } from '@/lib/grid/warnings';

/**
 * Phase 1 网格策略主入口（纯函数）。
 */
export function calculateGridStrategyV2(
  params: GridStrategyParamsV2,
  options: GridStrategyOptionsV2
): CalculateGridStrategyV2Result {
  const amountPerGrid = resolveAmountPerGrid(params, options);
  const legs = generateLegsWithAmount(params, options, amountPerGrid);
  const aggregatedRows = aggregateGridLegs(legs, params);
  const stressTest = computeStressTestV2(
    params,
    amountPerGrid,
    legs,
    aggregatedRows
  );
  const warnings = buildStrategyWarnings(params, options, legs, amountPerGrid);
  const state = resolveGridStrategyState(params.minPrice, options.currentPrice);

  return {
    amountPerGrid,
    legs,
    aggregatedRows,
    stressTest,
    warnings,
    state,
  };
}
