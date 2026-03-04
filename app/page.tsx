import { HomeToolGrid } from './HomeToolGrid';

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="home-page-inner">
        <h1 className="home-page-title">工具集</h1>
        <p className="home-page-desc">在线小工具，点击卡片进入对应功能。</p>
        <HomeToolGrid />
      </div>
    </main>
  );
}
