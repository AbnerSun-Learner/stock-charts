export default function HomePage() {
  return (
    <main className="home-page">
      <div className="home-page-inner">
        <h1 className="home-page-title">仓位视图</h1>
        <p className="home-page-desc">
          请使用带签名的链接访问图表，例如在 Notion 中嵌入时使用带 token 的 URL。
        </p>
        <p className="home-page-hint">
          <code>/view/sunburst?token=你的密钥</code>
        </p>
      </div>
    </main>
  );
}
