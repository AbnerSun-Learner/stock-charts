import type { GridParams } from "@/types/grid";
import { useCallback, useMemo, useState } from "react";

interface UseGridParamsReturn {
  params: GridParams;
  updateParam: (key: keyof GridParams, value: number | null) => void;
  validateParams: () => { isValid: boolean; errors: string[] };
  errors: string[];
  priceDecimals: number;
}

export function useGridParams(initialParams: GridParams): UseGridParamsReturn {
  const [params, setParams] = useState<GridParams>(initialParams);

  // 参数验证
  const validateParams = useCallback((): {
    isValid: boolean;
    errors: string[];
  } => {
    const newErrors: string[] = [];

    if (params.minPrice >= params.basePrice) {
      newErrors.push("最低价必须小于基准价");
    }
    if (
      params.minPrice <= 0 ||
      params.basePrice <= 0 ||
      params.amountPerGrid <= 0
    ) {
      newErrors.push("所有数值必须大于0");
    }
    if (
      params.smallGridStep <= 0 ||
      params.mediumGridStep <= 0 ||
      params.largeGridStep <= 0
    ) {
      newErrors.push("步长必须大于0");
    }
    if (
      params.smallGridStep > 100 ||
      params.mediumGridStep > 100 ||
      params.largeGridStep > 100
    ) {
      newErrors.push("步长不能超过100%");
    }
    // 校验关系：基础步长 < 中网步长 < 大网步长
    if (params.smallGridStep >= params.mediumGridStep) {
      newErrors.push("基础步长必须小于中网步长");
    }
    if (params.mediumGridStep >= params.largeGridStep) {
      newErrors.push("中网步长必须小于大网步长");
    }
    if (params.amountMultiplier < 0 || params.profitReserveMultiplier < 0) {
      newErrors.push("系数不能小于0");
    }

    return { isValid: newErrors.length === 0, errors: newErrors };
  }, [params]);

  // 计算错误状态
  const errors = useMemo(() => {
    const validation = validateParams();
    return validation.errors;
  }, [validateParams]);

  // 计算价格显示的小数位数
  const priceDecimals = useMemo(() => {
    const unit = params.priceUnit;
    if (unit >= 1) return 0;
    if (unit >= 0.1) return 1;
    if (unit >= 0.01) return 2;
    if (unit >= 0.001) return 3;
    return 4;
  }, [params.priceUnit]);

  // 更新参数
  const updateParam = useCallback(
    (key: keyof GridParams, value: number | null) => {
      if (value === null) return;
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return {
    params,
    updateParam,
    validateParams,
    errors,
    priceDecimals,
  };
}
