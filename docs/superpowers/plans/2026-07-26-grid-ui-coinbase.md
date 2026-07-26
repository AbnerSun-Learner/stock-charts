# Grid Strategy Coinbase UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 Coinbase 规格优化 `/view/grid`：双态布局（结果全宽表）、参数摘要条 + 抽屉改参、视觉 token 与主 KPI 置顶。

**Architecture:** 页面用 `hasResult = gridData.length > 0 && stressTest != null && calculationErrors.length === 0` 切换 `idle` / `result`。参数表单抽成可复用面板，idle 左栏与 Drawer 共用。主 KPI 由纯函数从 `StressTest` 映射，便于单测。样式仅改 `.grid-shell`。

**Tech Stack:** Next.js App Router、React 18、TypeScript、Ant Design 5（Drawer）、Tailwind、Jest、Playwright

## Global Constraints

- Token 仅限 `.grid-shell`；Primary `#0052ff`；active `#003ecc`；ink `#0a0b0d`；body `#5b616e`；hairline `#dee1e6`；surface-soft `#f7f7f7`；profit `#05b169`；loss `#cf202f`。
- 大卡 `24px`、紧凑 `12px`、pill `999px`；容器 `max-width: 90rem`；无 hero glow / 渐变主按钮。
- 不改 `src/lib/grid/**` 计算逻辑；不改首页皮肤；不引入新设计系统依赖。
- 抽屉内改参不自动重算；须点「重新生成」。

---

### Task 1: Primary KPI pure mapper + unit tests

**Files:**
- Create: `src/components/grid/build-primary-kpis.ts`
- Create: `__tests__/grid/build-primary-kpis.test.ts`
- Modify: `src/components/grid/stats-cards.tsx`（可选：导出 `StatCardItem` 类型到 shared 或在 mapper 内定义）

**Interfaces:**
- Produces: `export interface GridKpiItem { label: string; value: string; tooltip?: string | null; color?: string | null }`
- Produces: `export function buildPrimaryKpis(stressTest: StressTest): GridKpiItem[]`

- [ ] **Step 1: Write failing tests** for V2 four cards and legacy three cards (总买入金额、收益率、预期利润).
- [ ] **Step 2: Implement `buildPrimaryKpis`.**
- [ ] **Step 3: `npm test -- --runInBand __tests__/grid/build-primary-kpis.test.ts` → PASS.**
- [ ] **Step 4: Commit** `test(grid): add primary KPI mapper`

---

### Task 2: Coinbase tokens in `grid.css` + Ant theme

**Files:**
- Modify: `src/app/view/grid/grid.css`
- Modify: `src/components/grid/grid-antd-provider.tsx`

- [ ] **Step 1: Update CSS variables** to Coinbase table; remove/disable `.ds-hero-glow` usage styles; solid pill `.marketing-primary-btn`; `site-container--grid` → `90rem`; card radius helpers.
- [ ] **Step 2: Align Ant token** colorPrimary / borderRadius / ink text.
- [ ] **Step 3: Commit** `style(grid): apply Coinbase tokens to grid-shell`

---

### Task 3: Shared params panel + collapsible step section

**Files:**
- Create: `src/components/grid/grid-params-panel.tsx`
- Modify: `src/components/grid/base-info-config.tsx`（去掉英文 eyebrow）
- Modify: `src/components/grid/fund-coefficient-config.tsx`
- Modify: `src/components/grid/grid-step-config.tsx`（默认折叠：用 `<details>` 或 Ant `Collapse`，默认 `defaultActiveKey` 为空）

**Interfaces:**
- Produces: `GridParamsPanelProps` — params 回调 + dynamic grid props + 可选 `stepDefaultOpen?: boolean`（idle 面板 false；需要时 true）+ `footer?: ReactNode`

- [ ] **Step 1: Implement `GridParamsPanel` composing three configs + footer slot.**
- [ ] **Step 2: Step section collapsed by default; Chinese section titles only.**
- [ ] **Step 3: Commit** `refactor(grid): extract params panel with collapsed steps`

---

### Task 4: Summary bar + Drawer + page dual-mode layout

**Files:**
- Create: `src/components/grid/grid-params-summary-bar.tsx`
- Create: `src/components/grid/grid-primary-kpi-row.tsx`
- Modify: `src/app/view/grid/page.tsx`
- Modify: `src/components/grid/stats-cards.tsx`（`omitPrimary?: boolean` 避免与主 KPI 重复；或从 sections 去掉已置顶项）

**Interfaces:**
- `GridParamsSummaryBar({ basePrice, minPrice, totalBudget, budgetMode, gridCount, onEdit })`
- `GridPrimaryKpiRow({ stressTest })` uses `buildPrimaryKpis`
- Page: `paramsDrawerOpen` state; idle vs result branches

- [ ] **Step 1: Summary bar sticky + 修改参数.**
- [ ] **Step 2: Drawer (placement right, width 420; mobile `placement="bottom"` height ~90%) with panel + 重新生成.**
- [ ] **Step 3: Rewrite `page.tsx` layout per spec; warnings under result; no hero glow.**
- [ ] **Step 4: StatsCards omit duplicated primary metrics when shown above.**
- [ ] **Step 5: Commit** `feat(grid): dual-mode full-width results and params drawer`

---

### Task 5: E2E + verify

**Files:**
- Modify: `e2e/grid-strategy.spec.ts`（增加：生成后可见「修改参数」、表格全宽容器、打开抽屉见「重新生成」）

- [ ] **Step 1: Update / add Playwright assertions.**
- [ ] **Step 2: `npm test` + `npm run build`.**
- [ ] **Step 3: Manual or Playwright smoke on `/view/grid`.**
- [ ] **Step 4: Commit** `test(grid): cover dual-mode UI flows`

---

## Spec coverage

| Spec item | Task |
| --- | --- |
| Coinbase tokens / pill / no glow | 2 |
| idle / result dual layout, full-width table | 4 |
| Summary + drawer/sheet | 4 |
| Step collapsed | 3 |
| Primary KPI row | 1, 4 |
| E2E / build | 5 |
