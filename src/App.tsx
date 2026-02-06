import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ChartView from './pages/ChartView'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chart/:chartId" element={<ChartView />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
