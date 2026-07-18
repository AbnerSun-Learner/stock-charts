# Index Dashboard Bugfixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复指数仪表盘的估值边界误判、详情请求竞态、图表首屏包体积和 E2E 实时数据依赖。

**Architecture:** 估值比较改用明确的四态领域值；详情请求通过一个可单测的最新请求守卫控制状态提交；重型图表通过 `next/dynamic` 拆包；无估值 E2E 在浏览器网络层固定 Supabase 响应。现有 Supabase 表结构、公开读策略和 Repository 查询保持不变。

**Tech Stack:** Next.js 14 App Router、React 18、TypeScript、Jest、Playwright、Supabase JS、Ant Design Charts。

## Global Constraints

- Next.js、React、React DOM、`@types/react` 和 `@types/react-dom` 版本保持不变。
- 不修改 Supabase schema、RLS、GRANT 或共享行情写入逻辑。
- 每个功能行为必须先有失败测试，再写生产代码。
- 保留用户当前所有未提交改动，不提交无关文件。

---

### Task 1: 修复估值相等误判

**Files:**
- Modify: `src/types/index-dashboard.ts`
- Modify: `src/lib/index-dashboard/valuation-judge.ts`
- Modify: `src/components/index-dashboard/valuation-panel.tsx`
- Test: `__tests__/index-dashboard/valuation-judge.test.ts`

**Interfaces:**
- Produces: `ValuationComparison = 'below' | 'equal' | 'above'`。
- Produces: `ValuationJudgement.comparisonTo5y` 与 `comparisonTo10y`，均为 `ValuationComparison | null`。

- [ ] **Step 1: 写相等场景失败测试**

```ts
it('当前等于历史均值时显示持平', () => {
  const result = judgeValuation(
    snapshot({ currentPeTtm: 12, peTtmAvg5y: 12, peTtmAvg10y: 12 })
  );
  expect(result.comparisonTo5y).toBe('equal');
  expect(result.comparisonTo10y).toBe('equal');
  expect(result.summary).toBe('与近5年和近10年均值持平');
});
```

- [ ] **Step 2: 验证测试因缺少三态字段而失败**

Run: `npm test -- __tests__/index-dashboard/valuation-judge.test.ts --runInBand`

Expected: FAIL，`comparisonTo5y` 为 `undefined` 或摘要仍为“偏贵”。

- [ ] **Step 3: 实现四态比较并更新展示标签**

```ts
export type ValuationComparison = 'below' | 'equal' | 'above';

function compareValue(current: number, average: number | null): ValuationComparison | null {
  if (average == null) return null;
  if (current < average) return 'below';
  if (current > average) return 'above';
  return 'equal';
}

function comparisonLabel(comparison: ValuationComparison, label: string): string {
  const verb = comparison === 'below' ? '低于' : comparison === 'above' ? '高于' : '等于';
  return `${verb}${label}`;
}
```

```tsx
function CompareTag({ comparison, label }: {
  comparison: ValuationComparison | null;
  label: string;
}) {
  if (comparison == null) return <Tag>{label}：无数据</Tag>;
  const color = comparison === 'below' ? 'success' : comparison === 'above' ? 'warning' : undefined;
  return <Tag color={color}>{comparisonLabel(comparison, label)}</Tag>;
}
```

摘要函数对双 `equal` 返回“与近5年和近10年均值持平”，其余组合使用 `comparisonLabel` 拼接，不再从布尔值推断“高于”。

- [ ] **Step 4: 运行估值单测并确认通过**

Run: `npm test -- __tests__/index-dashboard/valuation-judge.test.ts --runInBand`

Expected: PASS。

### Task 2: 阻止过期详情请求覆盖新数据

**Files:**
- Create: `src/lib/index-dashboard/latest-request-guard.ts`
- Create: `__tests__/index-dashboard/latest-request-guard.test.ts`
- Modify: `src/components/index-dashboard/index-dashboard-page.tsx`

**Interfaces:**
- Produces: `LatestRequestGuard.begin(): number`。
- Produces: `LatestRequestGuard.isLatest(requestId: number): boolean`。
- Produces: `LatestRequestGuard.invalidate(): void`。

- [ ] **Step 1: 写最新请求守卫失败测试**

```ts
import { LatestRequestGuard } from '@/lib/index-dashboard/latest-request-guard';

it('只认可最后开始的请求', () => {
  const guard = new LatestRequestGuard();
  const first = guard.begin();
  const second = guard.begin();
  expect(guard.isLatest(first)).toBe(false);
  expect(guard.isLatest(second)).toBe(true);
});

it('失效后拒绝此前请求', () => {
  const guard = new LatestRequestGuard();
  const requestId = guard.begin();
  guard.invalidate();
  expect(guard.isLatest(requestId)).toBe(false);
});
```

- [ ] **Step 2: 验证测试因模块不存在而失败**

Run: `npm test -- __tests__/index-dashboard/latest-request-guard.test.ts --runInBand`

Expected: FAIL，无法解析 `latest-request-guard`。

- [ ] **Step 3: 实现守卫并接入详情加载**

```ts
export class LatestRequestGuard {
  private latestId = 0;
  begin(): number { return ++this.latestId; }
  isLatest(requestId: number): boolean { return requestId === this.latestId; }
  invalidate(): void { this.latestId += 1; }
}
```

```ts
const requestGuard = useMemo(() => new LatestRequestGuard(), []);

const loadDetail = useCallback(async (index: IndexWithEtf, days: KlineWindowDays) => {
  const requestId = requestGuard.begin();
  setDetailLoading(true);
  setError(null);
  try {
    const [val, industry, daily] = await Promise.all([
      repo.getValuation(index.indexCode),
      repo.getIndustryWeights(index.indexCode),
      repo.getEtfDaily(index.etfCode, daysAgoIsoDate(Math.ceil(days * 1.6))),
    ]);
    if (!requestGuard.isLatest(requestId)) return;
    setValuation(val);
    setWeights(industry);
    setBars(daily.slice(-days));
  } catch (err) {
    if (!requestGuard.isLatest(requestId)) return;
    setError(err instanceof Error ? err.message : '加载详情失败');
    setValuation(null);
    setWeights([]);
    setBars([]);
  } finally {
    if (requestGuard.isLatest(requestId)) setDetailLoading(false);
  }
}, [repo, requestGuard]);

useEffect(() => () => requestGuard.invalidate(), [requestGuard]);
```

- [ ] **Step 4: 运行守卫测试和全部指数仪表盘单测**

Run: `npm test -- __tests__/index-dashboard --runInBand`

Expected: PASS。

### Task 3: 拆分重型图表客户端代码

**Files:**
- Modify: `src/components/index-dashboard/index-dashboard-page.tsx`
- Modify: `src/components/index-dashboard/industry-weights-panel.tsx`
- Modify: `src/components/index-dashboard/etf-kline-panel.tsx`

**Interfaces:**
- Consumes: 现有 `IndustryWeightsPanelProps` 与 `EtfKlinePanelProps`。
- Produces: 动态加载的面板和 `Bar` / `Stock` 图表 chunk；对外 props 不变。

- [ ] **Step 1: 记录修复前构建基线**

Run: `npm run build`

Expected: `/view/index-dashboard` First Load JS 约为 784 kB。

- [ ] **Step 2: 用 `next/dynamic` 延迟加载图表面板和图表库**

```ts
const IndustryWeightsPanel = dynamic(
  () => import('./industry-weights-panel').then(module => module.IndustryWeightsPanel),
  { ssr: false, loading: () => <PanelLoading title="行业权重" /> }
);

const EtfKlinePanel = dynamic(
  () => import('./etf-kline-panel').then(module => module.EtfKlinePanel),
  { ssr: false, loading: () => <PanelLoading title="跟踪 ETF 行情" /> }
);
```

行业权重面板内：

```ts
const Bar = dynamic(
  () => import('@ant-design/charts').then(module => module.Bar),
  { ssr: false }
);
```

K 线面板内：

```ts
const Stock = dynamic(
  () => import('@ant-design/charts').then(module => module.Stock),
  { ssr: false }
);
```

- [ ] **Step 3: 构建并验证包体积下降**

Run: `npm run build`

Expected: 构建成功，`/view/index-dashboard` First Load JS 小于 784 kB。

### Task 4: 固定无估值 E2E 数据并完成回归

**Files:**
- Modify: `e2e/index-dashboard.spec.ts`

**Interfaces:**
- Consumes: Supabase PostgREST `etf_valuation` GET 请求。
- Produces: 与实时估值内容无关的无数据 UI 回归测试。

- [ ] **Step 1: 将无估值测试改为拦截固定空响应**

```ts
await page.route('**/rest/v1/etf_valuation*', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  });
});
await page.goto('/view/index-dashboard?code=000300.SH');
await expect(page.getByText('该指数暂无估值数据')).toBeVisible();
```

- [ ] **Step 2: 运行目标 E2E**

Run: `npx playwright test e2e/index-dashboard.spec.ts`

Expected: 2 passed。

- [ ] **Step 3: 运行完整验证**

Run: `npm test -- --runInBand`

Expected: 17 个测试套件全部通过。

Run: `npm run build`

Expected: 构建、类型检查和静态生成全部成功。

Run: `git diff --check`

Expected: 无输出。
