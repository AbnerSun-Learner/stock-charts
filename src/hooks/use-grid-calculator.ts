import { useCallback } from 'react';
import { runGridCalculation } from '@/lib/grid-run-calculation';
import type { GridParams } from '@/types/grid';

interface UseGridCalculatorProps {
  params: GridParams;
  validateParams: () => { isValid: boolean; errors: string[] };
  dynamicGridEnabled: boolean;
  dynamicGridMode: 'stable' | 'aggressive';
  currentPrice?: number;
}

export function useGridCalculator({
  params,
  validateParams,
  dynamicGridEnabled,
  dynamicGridMode,
  currentPrice,
}: UseGridCalculatorProps) {
  const calculateGrid = useCallback(
    () =>
      runGridCalculation(
        params,
        { dynamicGridEnabled, dynamicGridMode, currentPrice },
        validateParams()
      ),
    [params, validateParams, dynamicGridEnabled, dynamicGridMode, currentPrice]
  );

  return { calculateGrid };
}
