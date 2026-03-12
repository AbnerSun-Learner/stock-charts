/**
 * 旭日图图表库通过 window 调用的格式化函数（库在 iframe/worker 等环境可能拿不到 React 回调引用）
 */
export interface WindowWithSunburst {
  __sunburstFormat?: (d: unknown) => string;
  __sunburstLabel?: (d: unknown) => string;
}

declare global {
  interface Window extends WindowWithSunburst {}
}
