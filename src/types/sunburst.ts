/**
 * 旭日图节点数据结构（图表库与持仓树转换共用）。
 */
export interface SunburstNode {
  name: string;
  shares?: number;
  percentage?: string;
  children?: SunburstNode[];
}
