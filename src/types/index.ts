export interface SunburstData {
  name: string
  value: number // 市值百分比
  count?: number // 份数/数量
  percentage?: number // 百分比（可选，用于显示）
  children?: SunburstData[]
}

export interface ChartData {
  id: string
  title: string
  date: string
  updateTime: string
  data: SunburstData
  dataSource?: string
  disclaimer?: string[]
}
