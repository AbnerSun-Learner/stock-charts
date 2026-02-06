import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import SunburstChart from '../components/SunburstChart'
import { useCharts } from '../hooks/useCharts'
import './ChartView.css'

function ChartView() {
  const { chartId } = useParams<{ chartId: string }>()
  const navigate = useNavigate()
  const { charts } = useCharts()
  const [shareUrl, setShareUrl] = useState('')

  const chart = charts.find((c) => c.id === chartId)

  useEffect(() => {
    if (chart) {
      setShareUrl(window.location.href)
    }
  }, [chart])

  if (!chart) {
    return (
      <div className="chart-view">
        <div className="error-message">
          <h2>图表未找到</h2>
          <button onClick={() => navigate('/')}>返回首页</button>
        </div>
      </div>
    )
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    alert('链接已复制到剪贴板！')
  }

  return (
    <div className="chart-view">
      <div className="chart-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <div className="chart-title-section">
          <h1>{chart.title}</h1>
          <span className="chart-meta">
            {chart.date} | 更新时间: {chart.updateTime}
          </span>
        </div>
        <div className="chart-actions">
          <button className="share-button" onClick={handleCopyLink}>
            复制分享链接
          </button>
        </div>
      </div>

      {chart.disclaimer && (
        <div className="disclaimer">
          {chart.disclaimer.map((item, index) => (
            <p key={index}>{item}</p>
          ))}
        </div>
      )}

      <div className="chart-container">
        <SunburstChart data={chart.data} />
      </div>

      <div className="chart-info">
        <div className="info-section">
          <h3>数据说明</h3>
          <p>
            <strong>[XX]</strong> 表示份数/数量
          </p>
          <p>
            <strong>XX.XX%</strong> 表示市值百分比
          </p>
        </div>
        {chart.dataSource && (
          <div className="info-section">
            <h3>数据来源</h3>
            <p>{chart.dataSource}</p>
          </div>
        )}
      </div>

      <div className="notion-embed">
        <h3>嵌入 Notion</h3>
        <p>在 Notion 中使用以下代码嵌入此图表：</p>
        <div className="embed-code">
          <code>{`<iframe src="${shareUrl}" width="100%" height="800" frameborder="0"></iframe>`}</code>
        </div>
        <button className="copy-code-button" onClick={() => {
          const code = `<iframe src="${shareUrl}" width="100%" height="800" frameborder="0"></iframe>`
          navigator.clipboard.writeText(code)
          alert('嵌入代码已复制到剪贴板！')
        }}>
          复制嵌入代码
        </button>
      </div>
    </div>
  )
}

export default ChartView
