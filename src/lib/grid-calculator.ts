import type { GridParams, GridRow, StressTest } from '@/types/grid';
import type { GridStrategyOptionsV2, GridStrategyParamsV2 } from '@/types/grid-v2';
import { calculateGridStrategyV2 } from '@/lib/grid/grid-strategy';
import { adaptV2Result } from '@/lib/grid/legacy-adapter';

interface GridCalculationOptions {
  dynamicGridEnabled: boolean;
  dynamicGridMode: 'stable' | 'aggressive';
  currentPrice?: number;
}

interface GridCalculationResult {
  gridData: GridRow[];
  stressTest: StressTest;
}

/**
 * 将页面 GridParams 转为 V2 计算参数。
 */
export function toGridStrategyParamsV2(params: GridParams): GridStrategyParamsV2 {
  return { ...params };
}

/**
 * 根据网格参数生成策略明细与压力测试结果（Phase 1 V2 引擎）。
 */
export function calculateGridStrategy(
  params: GridParams,
  options: GridCalculationOptions
): GridCalculationResult {
  const v2Params = toGridStrategyParamsV2(params);
  const v2Options: GridStrategyOptionsV2 = {
    dynamicGridEnabled: options.dynamicGridEnabled,
    dynamicGridMode: options.dynamicGridMode,
    currentPrice: options.currentPrice,
  };
  const v2Result = calculateGridStrategyV2(v2Params, v2Options);
  const adapted = adaptV2Result(v2Result, v2Params);
  return {
    gridData: adapted.gridData,
    stressTest: adapted.stressTest,
  };
}

export { calculateGridStrategyV2 } from '@/lib/grid/grid-strategy';
export { adaptV2Result } from '@/lib/grid/legacy-adapter';
