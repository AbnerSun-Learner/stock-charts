# 家庭财务总览 · 金额显示/隐藏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/view/family` 总览用「显示金额」开关控制页内金额文案；默认隐藏为 `****`，开启后恢复真实数字。

**Architecture:** 总览页 `useState(false)` + `FamilyAmountVisibilityProvider`；`formatCny` / compact formatter 支持 `visible`；子组件经 hook 读可见性。无 Provider 时默认显示（兼容 ledger 等）。

**Tech Stack:** React Context、Ant Design Switch、现有 `formatCny`、Jest 静态/渲染测。

## Global Constraints

- 默认 `amountsVisible = false`；无 localStorage
- 隐藏文案固定 `****`（无 ¥、无正负号）
- 图表形状保留；百分比不遮
- 仅总览页及其嵌入子树；不改 DDL
- 提交信息中文 Conventional Commits

---

### Task 1: formatCny 可见性 + 单测

**Files:**

- Modify: `src/lib/family-finance/format.ts`
- Modify: `__tests__/family-finance/format.test.ts`

**Interfaces:**

- Produces:

  - `export const MASKED_AMOUNT = '****'`
  - `export type FormatCnyOptions = { visible?: boolean }`
  - `formatCny(amount: number, options?: FormatCnyOptions): string` — `visible === false` → `MASKED_AMOUNT`；缺省 / `true` 保持现网

- [x] **Step 1: 写失败测试**
- [x] **Step 2: 跑测确认失败**
- [x] **Step 3: 最小实现**
- [x] **Step 4: 跑测通过**
- [ ] **Step 5: Commit**（待用户确认后提交）

---

### Task 2: Context + Overview Switch + MetricCard

**Files:**

- Create: `src/components/family/family-amount-visibility.tsx`
- Modify: `src/components/family/family-overview-page.tsx`
- Modify: `src/components/family/family-finance-metric-card.tsx`
- Modify: `__tests__/family-finance/metric-card.test.ts`
- Create: `__tests__/family-finance/amount-visibility-ui.test.ts`

**Interfaces:**

- Produces:

  - `FamilyAmountVisibilityProvider({ value: boolean; children })`
  - `useFamilyAmountVisibility(): boolean` — 无 Provider 时返回 `true`

- [ ] **Step 1: Context 组件**

```tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";

const FamilyAmountVisibilityContext = createContext<boolean | null>(null);

export function FamilyAmountVisibilityProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return (
    <FamilyAmountVisibilityContext.Provider value={value}>
      {children}
    </FamilyAmountVisibilityContext.Provider>
  );
}

/** 无 Provider 时默认显示金额（ledger 等子路由）。 */
export function useFamilyAmountVisibility(): boolean {
  const ctx = useContext(FamilyAmountVisibilityContext);
  return ctx ?? true;
}
```

- [ ] **Step 2: MetricCard 接 hook + 失败/通过测**

```tsx
const amountsVisible = useFamilyAmountVisibility();
// ...
{
  formatCny(value, { visible: amountsVisible });
}
```

测试：用 Provider `value={false}` 包裹，期望含 `****`、不含 `¥123,456.00`。

- [ ] **Step 3: Overview header Switch + Provider**

- `useState(false)` 为 `amountsVisible`
- headerActions 最前：`<Switch checked={amountsVisible} onChange={setAmountsVisible} />` + 文案「显示金额」
- 空态与有数据两条 return 都用 Provider 包裹内容（含 policies embedded）
- 源码契约测试：overview 含 `显示金额`、`useState(false)`、`FamilyAmountVisibilityProvider`

- [ ] **Step 4: 跑测**

Run: `npm test -- --testPathPattern='metric-card|amount-visibility-ui|format' --no-coverage`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/family/family-amount-visibility.tsx \
  src/components/family/family-overview-page.tsx \
  src/components/family/family-finance-metric-card.tsx \
  __tests__/family-finance/metric-card.test.ts \
  __tests__/family-finance/amount-visibility-ui.test.ts
git commit -m "$(cat <<'EOF'
feat(family): 总览金额显示开关与 Context

EOF
)"
```

---

### Task 3: 图表与嵌入金额遮罩

**Files:**

- Modify: `src/components/family/family-balance-trend-chart.tsx`
- Modify: `src/components/family/family-asset-sankey.tsx`
- Modify: `src/components/family/family-mental-account-liquid.tsx`
- Modify: `src/components/family/family-policies-page.tsx`

- [ ] **Step 1: BalanceTrend** — `useFamilyAmountVisibility()`；Y 轴用 `formatCompactCny(v, { visible })`；tooltip `formatCny(..., { visible })`

- [ ] **Step 2: Sankey** — tooltip `valueFormatter` 走 `formatCny(v, { visible })`

- [ ] **Step 3: MentalAccountLiquid** — 当前/目标/超额三处 `formatCny`；百分比不动

- [ ] **Step 4: Policies** — 保额/保费列 `formatCny(v, { visible: useFamilyAmountVisibility() })`（在组件顶层取 hook，闭包进 render）

- [ ] **Step 5: 跑相关测 + build**

Run: `npm test -- --testPathPattern='family-finance' --no-coverage`  
Run: `npm run build`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/family/family-balance-trend-chart.tsx \
  src/components/family/family-asset-sankey.tsx \
  src/components/family/family-mental-account-liquid.tsx \
  src/components/family/family-policies-page.tsx
git commit -m "$(cat <<'EOF'
feat(family): 总览图表与嵌入保单金额跟随可见性

EOF
)"
```

---

### Task 4: Spec 状态 + CR

- [ ] 将 design spec 状态改为「已实现」
- [ ] 提交 docs（含本 plan、amount-visibility design）
- [ ] 派发 code-reviewer；修 Critical/Important
- [ ] 浏览器快速确认 `/view/family`：默认 `****`，打开 Switch 后数字恢复

---

## Spec coverage self-check

| Spec 项                           | Task  |
| --------------------------------- | ----- |
| 默认隐藏 / 无持久化               | T2    |
| `****` 文案                       | T1    |
| Context + format 入口             | T1–T2 |
| KPI / 趋势 / Sankey / 心智 / 保单 | T2–T3 |
| 百分比不遮 / 无 Provider 显示     | T2–T3 |
| 测试                              | T1–T2 |
