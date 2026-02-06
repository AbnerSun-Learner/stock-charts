import { useEffect, useRef } from 'react'
import { plotlib } from '@antv/g2-extension-plot'
import { Runtime, corelib, extend } from '@antv/g2'
import type { SunburstData } from '../types'

interface SunburstChartProps {
  data: SunburstData
}

function SunburstChart({ data }: SunburstChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 清理之前的图表实例
    if (chartRef.current) {
      chartRef.current.destroy()
    }

    // 扩展 Chart 以支持 sunburst
    const Chart = extend(Runtime, {
      ...corelib(),
      ...plotlib(),
    })

    // 创建图表实例
    const chart = new Chart({
      container: containerRef.current,
      autoFit: true,
      padding: [20, 20, 20, 20],
    })

    // 使用 options 配置图表
    chart.options({
      type: 'sunburst',
      data: {
        value: data,
      },
      encode: {
        value: 'value',
      },
      coordinate: {
        type: 'polar',
        innerRadius: 0.3,
      },
      scale: {
        color: {
          range: [
            '#1890ff',
            '#13c2c2',
            '#52c41a',
            '#faad14',
            '#f5222d',
            '#722ed1',
            '#eb2f96',
            '#fa8c16',
            '#2f54eb',
            '#a0d911',
          ],
        },
      },
      style: {
        fillOpacity: (d: any) => {
          if (d.depth === 0) return 1
          return 0.8
        },
        stroke: '#fff',
        lineWidth: 2,
      },
      label: {
        text: (d: any) => {
          const name = d.name || ''
          const percentage = d.percentage ? `${d.percentage.toFixed(2)}%` : ''
          const count = d.count !== undefined ? `[${d.count}]` : ''
          return `${name} ${count} ${percentage}`.trim()
        },
        position: 'inside',
        fontSize: 12,
        fill: '#333',
        fontWeight: 'bold',
      },
      tooltip: {
        title: (d: any) => d.name,
        items: [
          {
            field: 'value',
            name: '市值',
            valueFormatter: (v: number) => `${v.toFixed(2)}%`,
          },
          {
            field: 'count',
            name: '份数',
            valueFormatter: (v: number) => `[${v}]`,
          },
        ],
      },
      interaction: {
        drillDown: {
          breadCrumb: {
            rootText: '根节点',
            activeTextStyle: {
              fill: '#1890ff',
            },
          },
        },
      },
    })

    chart.render()

    chartRef.current = chart

    // 清理函数
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [data])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '600px',
        minHeight: '600px',
      }}
    />
  )
}

export default SunburstChart
