import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="home-page-inner">
        <h1 className="home-page-title">仓位视图</h1>
        <p className="home-page-desc">
          上传与 position_distribution.json 格式一致的 JSON 即可生成旭日图。
        </p>
        <p className="home-page-hint">
          <Link href="/view/sunburst">/view/sunburst</Link>
        </p>
      </div>
    </main>
  );
}
