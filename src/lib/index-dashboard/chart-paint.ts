/**
 * Canvas 渲染器无法直接解析 CSS 自定义属性，传入前先转换为实际颜色。
 */
export function resolveCanvasCssColor(variableName: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }

  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim() || fallback;
}

export function createIndustryPieLabel(show: boolean, color: string) {
  if (!show) {
    return false as const;
  }

  return {
    text: (datum: { name: string; weightPct: number }) =>
      `${datum.name}\n${datum.weightPct.toFixed(1)}%`,
    position: 'outside' as const,
    style: { fontSize: 11, fill: color },
  };
}
