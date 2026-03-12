import { HomeToolGrid } from './home-tool-grid';

/**
 * 应用首页：展示投研工具集的入口网格。
 */
export default function HomePage() {
  return (
    <main className="min-h-screen py-12 px-10">
      <div className="max-w-[1200px] mx-auto animate-[pageFadeIn_0.5s_var(--ease-out-expo)_both]">
        <header className="mb-10 pb-6 border-b border-[var(--border-subtle)] animate-[pageFadeIn_0.5s_var(--ease-out-expo)_both]">
          <h1 className="font-[var(--font-display)] text-[1.625rem] font-semibold tracking-tight text-[var(--text-primary)] m-0 mb-2">
            投资研究工具集
          </h1>
          <p className="text-sm text-[var(--text-muted)] m-0">专业数据可视化工具，助力投资决策</p>
        </header>
        <HomeToolGrid />
      </div>
    </main>
  );
}
