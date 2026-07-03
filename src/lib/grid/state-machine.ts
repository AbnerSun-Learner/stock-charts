import type { GridStrategyState } from '@/types/grid-v2';

/**
 * 根据当前价与参数判定策略状态（Phase 1 简化版）。
 */
export function resolveGridStrategyState(
  minPrice: number,
  currentPrice?: number
): GridStrategyState {
  if (currentPrice !== undefined && currentPrice <= minPrice) {
    return 'stopped';
  }
  return 'normal';
}
