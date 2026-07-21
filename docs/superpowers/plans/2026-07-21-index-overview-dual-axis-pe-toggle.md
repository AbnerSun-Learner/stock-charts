# 指数走势双轴与市盈率开关 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 走势图双轴（左 PE / 右点位 K），市盈率面板 Switch 默认关闭控制 PE 线显隐。

**Architecture:** 页面提升 `showPeLine`；纯函数 `buildOverviewChartSeries` 生成 DualAxes 数据；`ValuationPanel`（peTtm）渲染 Switch；无有效 PE 时 disabled。

**Tech Stack:** Next.js 14、React 18、Ant Design Switch、`@ant-design/charts` DualAxes、Jest、Playwright。

## Global Constraints

- 只读 `index_daily_metrics`；不新增 DDL / 第三方拉数。
- 默认 `showPeLine=false`；右轴格式 `K`；空 `peTtm` 不画点。
- 不做 PB 开关、均值虚线、URL 持久化。

---

### Task 1: 纯函数 + 单测

**Files:**

- Create/Modify: `src/lib/index-dashboard/chart-paint.ts`（或 `overview-chart.ts`）
- Test: `__tests__/index-dashboard/overview-chart.test.ts`

- [x] 写失败测试：`formatIndexPointsInK`、`buildOverviewChartSeries(points, showPeLine)`
- [x] 实现并通过

### Task 2: 走势面板 DualAxes

**Files:**

- Modify: `src/components/index-dashboard/index-overview-panel.tsx`

- [x] 接入 `showPeLine` + DualAxes

### Task 3: 开关与页面状态

**Files:**

- Modify: `src/components/index-dashboard/valuation-panel.tsx`
- Modify: `src/components/index-dashboard/index-dashboard-page.tsx`
- Modify: `e2e/index-dashboard.spec.ts`

- [x] peTtm 面板 Switch；无 PE 时 disabled
- [x] E2E：默认关；打开后可再关
- [x] `npm test` + 浏览器抽查
