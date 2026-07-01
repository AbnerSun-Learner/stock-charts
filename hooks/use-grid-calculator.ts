import { useCallback } from "react";
import { calculateGridStrategy } from "@/lib/grid-calculator";
import type { GridParams } from "@/types/grid";

interface UseGridCalculatorProps {
  params: GridParams;
  validateParams: () => { isValid: boolean; errors: string[] };
  dynamicGridEnabled: boolean;
  dynamicGridMode: "stable" | "aggressive";
}

export function useGridCalculator({
  params,
  validateParams,
  dynamicGridEnabled,
  dynamicGridMode,
}: UseGridCalculatorProps) {
  const calculateGrid = useCallback(() => {
    const validation = validateParams();
    if (!validation.isValid) {
      return { gridData: [], stressTest: null };
    }

    return calculateGridStrategy(params, {
      dynamicGridEnabled,
      dynamicGridMode,
    });
  }, [
    params,
    validateParams,
    dynamicGridEnabled,
    dynamicGridMode,
  ]);

  return { calculateGrid };
}
