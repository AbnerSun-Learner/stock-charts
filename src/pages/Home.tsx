import { Link } from 'react-router-dom'
import { useCharts } from '../hooks/useCharts'
import './Home.css'

function Home() {
  const { charts } = useCharts()

  return (
    <div className="home">
      <header className="home-header">
        <h1>股票组合旭日图</h1>
        <p>可视化您的投资组合配置</p>
      </header>
      <main className="home-main">
        <div className="charts-grid">
          {charts.map((chart) => (
            <Link
              key={chart.id}
              to={`/chart/${chart.id}`}
              className="chart-card"
            >
              <div className="chart-card-header">
                <h2>{chart.title}</h2>
                <span className="chart-date">{chart.date}</span>
              </div>
              <div className="chart-card-preview">
                <div className="chart-placeholder">
                  <span>点击查看图表</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

export default Home
