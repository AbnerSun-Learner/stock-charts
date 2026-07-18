# Index Industry Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将行业权重区域升级为响应式环形图、Top 3 结构观察卡和完整明细表。

**Architecture:** 新增纯函数计算 Top N 行业与集中度；行业面板继续消费当前级别过滤结果，并用动态导入的 Ant Design Charts `Pie` 渲染环形图。右侧观察卡和下方表格使用现有主题变量，所有内容均由真实权重和日期派生。

**Tech Stack:** Next.js 14、React 18、TypeScript、Ant Design Charts、Ant Design、Jest、Playwright。

## Global Constraints

- 不修改任何依赖版本、Supabase 查询或数据模型。
- 不添加代表公司或行业点评等不存在的数据。
- 保留申万一/二/三级 Tabs 和完整分页表格。
- 图表必须继续动态加载，指数页 First Load JS 保持低于 784 kB。

---

### Task 1: 行业集中度摘要

**Files:**
- Modify: `src/lib/index-dashboard/industry-weights.ts`
- Modify: `__tests__/index-dashboard/industry-weights.test.ts`

**Interfaces:**
- Produces: `IndustryConcentrationSummary`。
- Produces: `summarizeIndustryConcentration(weights, topN)`。

- [ ] **Step 1: 写 Top 3 排序、合计与空值失败测试**

```ts
expect(summarizeIndustryConcentration([
  weight('医药', 8),
  weight('银行', 12),
  weight('电子', 10),
  weight('食品', 5),
], 3)).toEqual({
  topIndustries: [
    { name: '银行', weightPct: 12, isOther: false },
    { name: '电子', weightPct: 10, isOther: false },
    { name: '医药', weightPct: 8, isOther: false },
  ],
  combinedWeightPct: 30,
});
expect(summarizeIndustryConcentration([], 3)).toEqual({
  topIndustries: [],
  combinedWeightPct: 0,
});
expect(summarizeIndustryConcentration([weight('银行', 12)], 0)).toEqual({
  topIndustries: [],
  combinedWeightPct: 0,
});
```

- [ ] **Step 2: 运行测试并确认因导出不存在而失败**

Run: `npm test -- __tests__/index-dashboard/industry-weights.test.ts --runInBand`

Expected: FAIL，`summarizeIndustryConcentration` 不是函数。

- [ ] **Step 3: 实现最小摘要函数**

```ts
export interface IndustryConcentrationSummary {
  topIndustries: IndustryWeightBar[];
  combinedWeightPct: number;
}

export function summarizeIndustryConcentration(
  weights: IndustryWeight[],
  topN: number = 3
): IndustryConcentrationSummary {
  if (weights.length === 0 || topN <= 0) {
    return { topIndustries: [], combinedWeightPct: 0 };
  }
  const topIndustries = [...weights]
    .sort((a, b) => b.weightPct - a.weightPct)
    .slice(0, topN)
    .map(item => ({ name: item.industryName, weightPct: item.weightPct, isOther: false }));
  return {
    topIndustries,
    combinedWeightPct: topIndustries.reduce((sum, item) => sum + item.weightPct, 0),
  };
}
```

- [ ] **Step 4: 运行行业权重测试并确认通过**

Run: `npm test -- __tests__/index-dashboard/industry-weights.test.ts --runInBand`

Expected: PASS。

### Task 2: 环形图与结构观察卡

**Files:**
- Modify: `src/components/index-dashboard/industry-weights-panel.tsx`

**Interfaces:**
- Consumes: `aggregateTopIndustryWeights`、`summarizeIndustryConcentration` 和当前级别 `filtered`。
- Produces: 左侧环形图、右侧 Top 3 卡、下方明细表。

- [ ] **Step 1: 将动态图表从 `Bar` 改为 `Pie`**

```ts
const Pie = dynamic(
  () => import('@ant-design/charts').then(module => module.Pie),
  { ssr: false }
);
```

- [ ] **Step 2: 生成当前级别摘要与稳定色板**

```ts
const INDUSTRY_COLORS = ['#2563eb', '#0f766e', '#7c3aed', '#ea580c', '#dc2626', '#475569'];
const summary = useMemo(() => summarizeIndustryConcentration(filtered, 3), [filtered]);
```

- [ ] **Step 3: 实现响应式双栏与明细表**

```tsx
<div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(320px,5fr)]">
  <div className="relative min-h-[430px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
    <Pie data={bars} angleField="weightPct" colorField="name" innerRadius={0.62} />
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">行业暴露</div>
  </div>
  <aside className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
    <div className="text-xs font-semibold text-[var(--accent)]">结构观察</div>
    <h3>当前结构最集中的三大行业</h3>
    <p>前三行业合计 {summary.combinedWeightPct.toFixed(2)}%</p>
    {summary.topIndustries.map((item, index) => (
      <div key={item.name}>{index + 1}. {item.name} {item.weightPct.toFixed(2)}%</div>
    ))}
  </aside>
</div>
<Table dataSource={filtered} />
```

- [ ] **Step 4: 运行单测和生产构建**

Run: `npm test -- __tests__/index-dashboard --runInBand`

Expected: PASS。

Run: `npm run build`

Expected: 构建成功且指数页 First Load JS 小于 784 kB。

### Task 3: 端到端与视觉验证

**Files:**
- Modify: `e2e/index-dashboard.spec.ts`

**Interfaces:**
- Produces: 真实行情下行业可视化关键内容的 E2E 断言。

- [ ] **Step 1: 在主链路 E2E 中添加结构观察断言**

```ts
await expect(page.getByText('结构观察')).toBeVisible();
await expect(page.getByText('当前结构最集中的三大行业')).toBeVisible();
await expect(page.getByText(/前三行业合计 \d+\.\d+%/)).toBeVisible();
await expect(page.getByRole('table')).toBeVisible();
```

- [ ] **Step 2: 运行指数页 E2E**

Run: `npx playwright test e2e/index-dashboard.spec.ts`

Expected: 2 passed。

- [ ] **Step 3: 截图检查桌面与移动端**

使用本地生产服务器分别以 1440×1000 和 390×844 截图，确认双栏/堆叠布局、标签和卡片无溢出。

- [ ] **Step 4: 完整回归**

Run: `npm test -- --runInBand`

Expected: 17 个测试套件全部通过。

Run: `npm run build`

Expected: 构建成功。

Run: `git diff --check`

Expected: 无输出。

