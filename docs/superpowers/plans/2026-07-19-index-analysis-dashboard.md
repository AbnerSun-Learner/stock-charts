# Index Analysis Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ETF K-line dashboard with index history, PE/PB analysis, existing industry weights, drawdown levels, and an ETF-aware grid shortcut.

**Architecture:** The browser reads normalized `index_daily_metrics`, latest `index_industry_weights`, and one latest `etf_daily` close through a read-only repository. Pure functions own windowing and statistics; panels render independent loading/error/empty states. Grid query parsing is isolated and only valid positive prices override defaults.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS 4, Ant Design 5, `@ant-design/charts`, Jest, Playwright, Supabase JS.

## Global Constraints

- Use `index_valuation`, not `etf_valuation`, wherever a snapshot query remains.
- Do not fetch ETF.run or any third-party market source from `stock-charts`.
- Keep the existing industry ring chart and Top 3 observation layout.
- Remove the tracking ETF K-line panel.
- Keep missing-data modules visible with explicit empty states.
- Preserve unrelated dirty worktree changes.
- Do not upgrade dependencies.

---

### Task 1: Add index analysis types and pure calculations

**Files:**
- Modify: `src/types/index-dashboard.ts`
- Create: `src/lib/index-dashboard/metric-analysis.ts`
- Create: `src/lib/index-dashboard/drawdown.ts`
- Create: `__tests__/index-dashboard/metric-analysis.test.ts`
- Create: `__tests__/index-dashboard/drawdown.test.ts`

**Interfaces:**
- Produces: `IndexMetricPoint`, `AnalysisWindow`, `ValuationMetricKey`, `ValuationStatistics`, `DrawdownSummary`.
- Produces: `filterMetricWindow(points, window)`, `analyzeValuation(points, key)`, `calculateDrawdown(points)`.

- [ ] **Step 1: Write failing window/statistics tests**

```ts
expect(filterMetricWindow(points, '5y')).toEqual(expectedFiveYearPoints);
expect(analyzeValuation(points, 'peTtm')).toMatchObject({
  current: 30,
  min: 10,
  max: 30,
  average: 20,
  currentPercentile: 100,
  sampleCount: 3,
});
expect(analyzeValuation(shortPoints, 'pb').insufficientSamples).toBe(true);
```

Include duplicate current values, invalid values, 24 bins, all-equal values, and inclusive date boundaries.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- --runInBand __tests__/index-dashboard/metric-analysis.test.ts __tests__/index-dashboard/drawdown.test.ts`

Expected: FAIL because modules are missing.

- [ ] **Step 3: Implement deterministic analysis functions**

Use the newest valid point as the window anchor. Percentile is `count(value <= current) / sampleCount * 100`. Quantiles use linear interpolation between adjacent sorted values. Use exactly 24 equal-width bins, except all-equal values produce one bin. Mark fewer than 20 samples as insufficient.

- [ ] **Step 4: Implement drawdown calculation**

```ts
return {
  currentClose,
  historyHigh,
  drawdownFromHighPct: (currentClose / historyHigh - 1) * 100,
  waterline70: historyHigh * 0.3,
  waterline80: historyHigh * 0.2,
  waterline70ChangePct: (historyHigh * 0.3 / currentClose - 1) * 100,
  waterline80ChangePct: (historyHigh * 0.2 / currentClose - 1) * 100,
};
```

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --runInBand __tests__/index-dashboard/metric-analysis.test.ts __tests__/index-dashboard/drawdown.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/index-dashboard.ts src/lib/index-dashboard/metric-analysis.ts \
  src/lib/index-dashboard/drawdown.ts __tests__/index-dashboard/metric-analysis.test.ts \
  __tests__/index-dashboard/drawdown.test.ts
git commit -m "feat(index): add valuation analysis"
```

### Task 2: Extend row mapping and the read-only repository

**Files:**
- Modify: `src/lib/index-dashboard/map-rows.ts`
- Modify: `src/lib/supabase/index-market-repository.ts`
- Modify: `__tests__/index-dashboard/map-rows.test.ts`

**Interfaces:**
- Consumes: `index_daily_metrics`, `index_valuation`, `etf_daily`.
- Produces: `mapIndexMetricRows`, `getIndexMetrics(indexCode)`, `getLatestEtfClose(etfCode)`.

- [ ] **Step 1: Write failing mapping tests**

```ts
expect(mapIndexMetricRows([{ index_code: '000300.SH', trade_date: '2026-07-17', close: '4529.1', pe_ttm: '22.62', pb: '2.34' }]))
  .toEqual([{ indexCode: '000300.SH', tradeDate: '2026-07-17', close: 4529.1, peTtm: 22.62, pb: 2.34 }]);
```

Test null fields and malformed numeric values.

- [ ] **Step 2: Run the mapping test and confirm failure**

Run: `npm test -- --runInBand __tests__/index-dashboard/map-rows.test.ts`

Expected: FAIL because `mapIndexMetricRows` is missing.

- [ ] **Step 3: Add repository queries**

```ts
this.client.from('index_daily_metrics')
  .select('index_code, trade_date, close, pe_ttm, pb')
  .eq('index_code', indexCode)
  .order('trade_date', { ascending: true });

this.client.from('etf_daily')
  .select('close_qfq, close, trade_date')
  .eq('etf_code', etfCode)
  .order('trade_date', { ascending: false })
  .limit(1)
  .maybeSingle();
```

Prefer positive `close_qfq`, then positive `close`; otherwise return `null`.

- [ ] **Step 4: Rename the snapshot table query**

If `getValuation` remains during the transition, query `.from('index_valuation')`. Do not add a fallback to the old name.

- [ ] **Step 5: Run focused and existing repository-adjacent tests**

Run: `npm test -- --runInBand __tests__/index-dashboard/map-rows.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/index-dashboard/map-rows.ts src/lib/supabase/index-market-repository.ts \
  __tests__/index-dashboard/map-rows.test.ts
git commit -m "feat(index): read historical metrics"
```

### Task 3: Build overview, valuation, and drawdown panels

**Files:**
- Create: `src/components/index-dashboard/panel-shell.tsx`
- Create: `src/components/index-dashboard/index-overview-panel.tsx`
- Rewrite: `src/components/index-dashboard/valuation-panel.tsx`
- Create: `src/components/index-dashboard/drawdown-panel.tsx`
- Create: `__tests__/index-dashboard/panel-state.test.tsx`

**Interfaces:**
- Consumes: pure analysis results from Task 1.
- Produces: independently renderable panels with `loading`, `error`, and empty states.

- [ ] **Step 1: Write failing panel-state tests**

Verify each panel keeps its heading visible for loading, error, empty, insufficient, and populated states. Verify PE and PB labels are passed through the same `ValuationPanel` component.

- [ ] **Step 2: Run panel tests and confirm failure**

Run: `npm test -- --runInBand __tests__/index-dashboard/panel-state.test.tsx`

Expected: FAIL because the new component contracts are missing.

- [ ] **Step 3: Extract `PanelShell`**

Use the existing rounded card, border, background, spacing, and design-token classes. Accept `title`, optional `description`, and `children`.

- [ ] **Step 4: Implement the index overview**

Render `上市以来 / 近 10 年 / 近 5 年` with Ant Design `Segmented`, an updated-through date, and a dynamically imported `Line` chart for valid closes.

- [ ] **Step 5: Rewrite the valuation panel as a generic PE/PB panel**

Render a 24-bin `Column` chart and the current, 20%, 50%, 80%, latest, highest, lowest, and average cards. For fewer than 20 samples, show current value plus “有效样本不足” and omit distribution/percentiles.

- [ ] **Step 6: Implement the drawdown panel**

Render cards for current close, current drawdown, 70% waterline, and 80% waterline. Use green only for a negative change value and design-token colors for neutral values.

- [ ] **Step 7: Run tests**

Run: `npm test -- --runInBand __tests__/index-dashboard/panel-state.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/index-dashboard/panel-shell.tsx \
  src/components/index-dashboard/index-overview-panel.tsx \
  src/components/index-dashboard/valuation-panel.tsx \
  src/components/index-dashboard/drawdown-panel.tsx \
  __tests__/index-dashboard/panel-state.test.tsx
git commit -m "feat(index): add analysis panels"
```

### Task 4: Recompose the dashboard with partial resource states

**Files:**
- Modify: `src/components/index-dashboard/index-dashboard-page.tsx`
- Modify: `src/components/index-dashboard/industry-weights-panel.tsx`
- Delete: `src/components/index-dashboard/etf-kline-panel.tsx`
- Modify: `src/app/view/index-dashboard/page.tsx`
- Modify: `__tests__/index-dashboard/latest-request-guard.test.ts`
- Modify: `e2e/index-dashboard.spec.ts`

**Interfaces:**
- Consumes: repository methods and panels from Tasks 1–3.
- Produces: final order `selector → overview → PE → PB → industry → drawdown`.

- [ ] **Step 1: Update E2E expectations first**

Assert the new headings are visible, `跟踪 ETF 行情` is absent, industry observation remains visible, and empty responses preserve headings.

- [ ] **Step 2: Run E2E or component tests and confirm failure**

Run: `npm test -- --runInBand __tests__/index-dashboard`

Expected: existing tests fail against the new requirements until recomposition is implemented.

- [ ] **Step 3: Replace the single detail state with independent resources**

Use a small state shape per resource:

```ts
type ResourceState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};
```

Start all three requests together, handle each result independently, and guard every write with the same request id.

- [ ] **Step 4: Remove ETF K-line state and component**

Keep only the latest ETF close request used by the grid shortcut. Remove `windowDays`, price bars, and the dynamic stock chart import.

- [ ] **Step 5: Render the approved module order**

Filter the metric data with the selected analysis window and pass the same filtered points to overview, PE, PB, and drawdown panels. Pass latest weights to the existing industry panel.

- [ ] **Step 6: Update route metadata**

Description: `指数走势、PE/PB 估值、行业权重与极限跌幅分析`.

- [ ] **Step 7: Run unit tests**

Run: `npm test -- --runInBand __tests__/index-dashboard`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/index-dashboard/index-dashboard-page.tsx \
  src/components/index-dashboard/industry-weights-panel.tsx \
  src/app/view/index-dashboard/page.tsx e2e/index-dashboard.spec.ts \
  __tests__/index-dashboard/latest-request-guard.test.ts
git add -u src/components/index-dashboard/etf-kline-panel.tsx
git commit -m "feat(index): compose analysis dashboard"
```

### Task 5: Add the ETF-aware grid shortcut and prefill

**Files:**
- Create: `src/lib/grid/grid-prefill.ts`
- Create: `__tests__/grid/grid-prefill.test.ts`
- Modify: `src/components/index-dashboard/index-dashboard-page.tsx`
- Modify: `src/app/view/grid/page.tsx`
- Modify: `src/hooks/use-grid-params.ts`
- Modify: `e2e/grid-strategy.spec.ts`
- Modify: `e2e/index-dashboard.spec.ts`

**Interfaces:**
- Produces: `buildGridShortcutHref(input) -> string` and `parseGridPrefill(searchParams) -> GridPrefill`.
- Consumes: selected ETF metadata and latest close from Task 4.

- [ ] **Step 1: Write failing prefill tests**

```ts
expect(buildGridShortcutHref({ etfCode: '510300', etfName: '沪深300ETF', basePrice: 3.912 }))
  .toBe('/view/grid?etfCode=510300&etfName=%E6%B2%AA%E6%B7%B1300ETF&basePrice=3.912');
expect(parseGridPrefill(new URLSearchParams('basePrice=-1')).basePrice).toBeNull();
expect(parseGridPrefill(new URLSearchParams('basePrice=NaN')).basePrice).toBeNull();
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- --runInBand __tests__/grid/grid-prefill.test.ts`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement URL construction and strict parsing**

Trim text values, accept only a six-digit ETF code, cap the ETF name at 80 characters, and accept only finite positive prices.

- [ ] **Step 4: Let `useGridParams` accept the parsed initial base price**

Construct initial params once:

```ts
const initialParams = useMemo(() => ({
  ...DEFAULT_GRID_PARAMS,
  ...(prefill.basePrice == null ? {} : { basePrice: prefill.basePrice }),
}), [prefill.basePrice]);
```

Do not overwrite `minPrice` or any budget fields.

- [ ] **Step 5: Show the selected ETF context on the grid page**

Render a compact context strip only when a valid ETF code exists. Direct grid visits render no strip and keep the existing defaults.

- [ ] **Step 6: Add the shortcut beside the index selector**

Use a normal Next `Link`, disabled styling while the selected index is absent, and preserve accessibility with the name `前往网格策略`.

- [ ] **Step 7: Run unit and E2E tests**

Run: `npm test -- --runInBand __tests__/grid/grid-prefill.test.ts`

Run: `npm run test:e2e -- e2e/index-dashboard.spec.ts e2e/grid-strategy.spec.ts`

Expected: valid prefill passes through; missing latest price leaves the grid default unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/lib/grid/grid-prefill.ts __tests__/grid/grid-prefill.test.ts \
  src/components/index-dashboard/index-dashboard-page.tsx src/app/view/grid/page.tsx \
  src/hooks/use-grid-params.ts e2e/index-dashboard.spec.ts e2e/grid-strategy.spec.ts
git commit -m "feat(grid): prefill from index dashboard"
```

### Task 6: Full verification and visual QA

**Files:**
- Modify only files required by verified defects.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified production build and responsive dashboard.

- [ ] **Step 1: Run the full Jest suite**

Run: `npm test -- --runInBand`

Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: build succeeds; `/view/index-dashboard` and `/view/grid` compile.

- [ ] **Step 3: Run focused Playwright suites**

Run: `npm run test:e2e -- e2e/index-dashboard.spec.ts e2e/grid-strategy.spec.ts`

Expected: all focused browser tests pass.

- [ ] **Step 4: Inspect desktop and mobile layouts**

At approximately 1440 px and 390 px widths, verify no horizontal overflow, readable chart labels, stable card order, retained industry layout, and a visible grid shortcut.

- [ ] **Step 5: Run final hygiene checks**

Run: `git diff --check`

Run: `git status --short`

Expected: no whitespace errors; only intended task changes remain.

- [ ] **Step 6: Commit verified fixes, if any**

Stage only files changed to fix an observed verification defect and use the concrete message `fix(index): correct verified dashboard defect`.
