import type {
  GridLayerLabel,
  GridLayerType,
  GridStrategyOptionsV2,
  GridStrategyParamsV2,
  PriceLadderEntry,
} from '@/types/grid-v2';
import { roundToTick } from '@/lib/grid/trade-cost';

interface LayerDefinition {
  gridType: GridLayerType;
  gridLabel: GridLayerLabel;
  initialStepPct: number;
  startBuyPrice: number;
}

/**
 * 生成三层网格的价格线（含兜底网）。
 */
export function generateAllPriceLadders(
  params: GridStrategyParamsV2,
  options: GridStrategyOptionsV2
): PriceLadderEntry[] {
  const layers = buildLayerDefinitions(params);
  const maxGridCount = options.maxGridCount ?? 10;
  return layers.flatMap(layer =>
    generateLayerPriceLadder(params, options, layer, maxGridCount)
  );
}

function buildLayerDefinitions(params: GridStrategyParamsV2): LayerDefinition[] {
  const mediumRatio = params.mediumGridStep / 100;
  const largeRatio = params.largeGridStep / 100;
  return [
    {
      gridType: 'small',
      gridLabel: '小网',
      initialStepPct: params.smallGridStep,
      startBuyPrice: params.basePrice,
    },
    {
      gridType: 'medium',
      gridLabel: '中网',
      initialStepPct: params.mediumGridStep,
      startBuyPrice: params.basePrice * (1 - mediumRatio),
    },
    {
      gridType: 'large',
      gridLabel: '大网',
      initialStepPct: params.largeGridStep,
      startBuyPrice: params.basePrice * (1 - largeRatio),
    },
  ];
}

function generateLayerPriceLadder(
  params: GridStrategyParamsV2,
  options: GridStrategyOptionsV2,
  layer: LayerDefinition,
  maxGridCount: number
): PriceLadderEntry[] {
  const entries: PriceLadderEntry[] = [];
  const seenPrices = new Set<number>();
  const dynamicScale = getDynamicScale(options);
  let stepRatio = layer.initialStepPct / 100;
  let previousBuyPrice = layer.startBuyPrice;
  let stopped = false;

  for (let index = 0; index < maxGridCount && !stopped; index += 1) {
    const buyPrice = resolveNextBuyPrice(
      index,
      previousBuyPrice,
      layer.startBuyPrice,
      stepRatio,
      params
    );

    if (buyPrice === null) {
      stopped = true;
      break;
    }

    if (buyPrice.kind === 'bottom') {
      maybeAppendBottomGrid(
        params,
        layer,
        entries,
        seenPrices,
        stepRatio,
        previousBuyPrice,
        buyPrice.price
      );
      stopped = true;
      break;
    }

    const roundedBuy = buyPrice.price;
    if (seenPrices.has(roundedBuy) || roundedBuy <= 0) {
      previousBuyPrice = roundedBuy;
      stepRatio = advanceStep(stepRatio, layer.initialStepPct, index, dynamicScale);
      continue;
    }

    appendLadderEntry(
      entries,
      seenPrices,
      layer,
      entries.length,
      roundedBuy,
      stepRatio,
      false,
      params.priceUnit
    );
    previousBuyPrice = roundedBuy;
    stepRatio = advanceStep(stepRatio, layer.initialStepPct, index, dynamicScale);
  }

  if (!stopped && entries.length > 0) {
    appendMaxCountBottomGrid(
      params,
      layer,
      entries,
      seenPrices,
      stepRatio,
      previousBuyPrice
    );
  }

  return entries;
}

type NextBuyPrice =
  | { kind: 'normal'; price: number }
  | { kind: 'bottom'; price: number }
  | null;

function resolveFloorBuyPrice(params: GridStrategyParamsV2): number {
  // 买入价硬地板：取整后不得低于 minPrice
  return roundToTick(params.minPrice, params.priceUnit, 'up');
}

function resolveNextBuyPrice(
  index: number,
  previousBuyPrice: number,
  startBuyPrice: number,
  stepRatio: number,
  params: GridStrategyParamsV2
): NextBuyPrice {
  const floorBuy = resolveFloorBuyPrice(params);

  if (index === 0) {
    const rounded = roundToTick(startBuyPrice, params.priceUnit, 'down');
    if (rounded > params.minPrice) {
      return { kind: 'normal', price: rounded };
    }
    return {
      kind: 'bottom',
      price: floorBuy,
    };
  }

  const calculatedNext = roundToTick(
    previousBuyPrice * (1 - stepRatio),
    params.priceUnit,
    'down'
  );

  if (calculatedNext > params.minPrice) {
    return { kind: 'normal', price: calculatedNext };
  }

  // 最后一网：夹到 minPrice 硬地板，不允许更深
  return {
    kind: 'bottom',
    price: floorBuy,
  };
}

function maybeAppendBottomGrid(
  params: GridStrategyParamsV2,
  layer: LayerDefinition,
  entries: PriceLadderEntry[],
  seenPrices: Set<number>,
  stepRatio: number,
  previousBuyPrice: number,
  lastGridPrice: number
): void {
  if (
    !seenPrices.has(lastGridPrice) &&
    (entries.length === 0 || previousBuyPrice > lastGridPrice)
  ) {
    appendLadderEntry(
      entries,
      seenPrices,
      layer,
      entries.length,
      lastGridPrice,
      stepRatio,
      true,
      params.priceUnit
    );
  }
}

function appendMaxCountBottomGrid(
  params: GridStrategyParamsV2,
  layer: LayerDefinition,
  entries: PriceLadderEntry[],
  seenPrices: Set<number>,
  stepRatio: number,
  lastBuyPrice: number
): void {
  if (lastBuyPrice <= params.minPrice) return;

  const lastGridPrice = resolveFloorBuyPrice(params);
  maybeAppendBottomGrid(
    params,
    layer,
    entries,
    seenPrices,
    stepRatio,
    lastBuyPrice,
    lastGridPrice
  );
}

function appendLadderEntry(
  entries: PriceLadderEntry[],
  seenPrices: Set<number>,
  layer: LayerDefinition,
  indexInLayer: number,
  buyPrice: number,
  stepRatio: number,
  isBottomGrid: boolean,
  priceUnit: number
): void {
  const sellPrice = roundToTick(buyPrice * (1 + stepRatio), priceUnit, 'up');
  const effectiveStepRatio =
    sellPrice > 0 ? (sellPrice - buyPrice) / sellPrice : stepRatio;
  seenPrices.add(buyPrice);
  entries.push({
    gridType: layer.gridType,
    gridLabel: layer.gridLabel,
    indexInLayer,
    buyPrice,
    sellPrice,
    stepRatio,
    effectiveStepRatio,
    isBottomGrid,
  });
}

function getDynamicScale(options: GridStrategyOptionsV2): number {
  if (!options.dynamicGridEnabled) return 0;
  return options.dynamicGridMode === 'stable' ? 0.3 : 0.6;
}

function advanceStep(
  stepRatio: number,
  initialStepPct: number,
  index: number,
  dynamicScale: number
): number {
  if (index >= 1 && dynamicScale > 0) {
    const next = stepRatio * (1 + dynamicScale);
    return next >= 1 ? stepRatio : next;
  }
  return initialStepPct / 100;
}
