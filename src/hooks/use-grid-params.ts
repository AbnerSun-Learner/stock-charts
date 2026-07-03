import type { GridParams } from '@/types/grid';
import type { GridBudgetMode } from '@/types/grid-v2';
import { getPriceDecimals, validateGridParams } from '@/lib/grid-validate-params';
import { useCallback, useMemo, useState } from 'react';

interface UseGridParamsReturn {
  params: GridParams;
  updateParam: (key: keyof GridParams, value: number | null) => void;
  updateBudgetMode: (mode: GridBudgetMode) => void;
  validateParams: () => { isValid: boolean; errors: string[] };
  errors: string[];
  priceDecimals: number;
}

export function useGridParams(initialParams: GridParams): UseGridParamsReturn {
  const [params, setParams] = useState<GridParams>(initialParams);

  const validateParams = useCallback(() => validateGridParams(params), [params]);

  const errors = useMemo(() => validateParams().errors, [validateParams]);

  const priceDecimals = useMemo(
    () => getPriceDecimals(params.priceUnit),
    [params.priceUnit]
  );

  const updateParam = useCallback(
    (key: keyof GridParams, value: number | null) => {
      if (value === null) return;
      setParams(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateBudgetMode = useCallback((mode: GridBudgetMode) => {
    setParams(prev => ({ ...prev, budgetMode: mode }));
  }, []);

  return {
    params,
    updateParam,
    updateBudgetMode,
    validateParams,
    errors,
    priceDecimals,
  };
}
