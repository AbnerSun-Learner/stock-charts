export type GridType = "小网" | "中网" | "大网";

export interface GridRow {
  position: number;
  buyTriggerPrice: number;
  buyPrice: number;
  buyAmount: number;
  buyShares: number;
  sellTriggerPrice: number;
  sellPrice: number;
  sellShares: number;
  sellAmount: number;
  priceDropRate: number;
  gridType: GridType;
}

export interface StressTest {
  totalBuyAmount: number;
  totalBuyShares: number;
  totalSellAmount: number;
  totalSellShares: number;
  remainingShares: number;
  profit: number;
  profitRate: number;
}

export interface GridParams {
  minTradeUnit: number;
  priceUnit: number;
  basePrice: number;
  amountPerGrid: number;
  minPrice: number;
  smallGridStep: number;
  mediumGridStep: number;
  largeGridStep: number;
  amountMultiplier: number;
  profitReserveMultiplier: number;
}

export interface SavedScheme {
  id: string;
  name: string;
  timestamp: number;
  params: GridParams;
  gridData: GridRow[];
  stressTest: StressTest;
}
