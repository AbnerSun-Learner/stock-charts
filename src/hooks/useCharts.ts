import { useState, useEffect } from 'react'
import type { ChartData } from '../types'
import chartsData from '../data/charts.json'

export function useCharts() {
  const [charts, setCharts] = useState<ChartData[]>([])

  useEffect(() => {
    // 从 JSON 文件加载图表数据
    setCharts(chartsData as ChartData[])
  }, [])

  return { charts }
}
