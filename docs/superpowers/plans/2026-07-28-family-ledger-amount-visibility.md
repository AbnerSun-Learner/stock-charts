# 记账页金额显隐 Implementation Plan

> **For agentic workers:** 按任务顺序实现；步骤用 checkbox 跟踪。

**Goal:** `/view/family/ledger` 与总览一致的金额显隐（默认隐藏、眼睛切换、展示层 `****`；弹窗明文）。

**Architecture:** 复用 `FamilyAmountVisibilityProvider` / `useFamilyAmountVisibility`；页级 `useState(false)`；环图与历史折线内部读 hook。

**Tech Stack:** React、Ant Design icons、既有 `formatCny` / `formatCompactCny`。

## Global Constraints

- 弹窗金额输入不遮罩
- 不持久化
- 不改 DDL

---

### Task 1: 契约测试

- [x] 新增 `__tests__/family-finance/ledger-amount-visibility-ui.test.ts`（对齐 overview 契约）
- [x] 跑测确认先失败

### Task 2: Ledger 页 Provider + 表格

- [x] `family-ledger-page.tsx`：眼睛、Provider、表格 `visible`
- [x] 更新 `family-amount-visibility.tsx` 注释

### Task 3: 图表组件

- [x] `family-asset-structure-pie.tsx` 读 hook
- [x] `family-asset-history-line.tsx` 读 hook；Y 轴用 `formatCompactCny`；必要时 remount key

### Task 4: 样式 + 验证

- [x] `globals.css` 样式覆盖 ledger（或上提至 `.family-finance-page`）
- [x] `npm test` + `npm run build` + 浏览器抽查
