import { useCallback } from 'react';
import { runGridCalculation } from '@/lib/grid-run-calculation';
import type { GridParams } from '@/types/grid';

interface UseGridCalculatorProps {
  params: GridParams;
  validateParams: () => { isValid: boolean; errors: string[] };
  dynamicGridEnabled: boolean;
  dynamicGridMode: 'stable' | 'aggressive';
}

export function useGridCalculator({
  params,
  validateParams,
  dynamicGridEnabled,
  dynamicGridMode,
}: UseGridCalculatorProps) {
  const calculateGrid = useCallback(
    () =>
      runGridCalculation(
        params,
        { dynamicGridEnabled, dynamicGridMode },
        validateParams()
      ),
    [params, validateParams, dynamicGridEnabled, dynamicGridMode]
  );

  return { calculateGrid };
}
