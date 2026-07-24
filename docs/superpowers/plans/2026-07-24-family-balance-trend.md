# 家庭财务总览 · 资产负债趋势 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/view/family` KPI 区右侧加入总资产/总负债双折线（可切换时间范围，图例可显示净资产）。

**Architecture:** 直读 `family_snapshots`；本仓纯函数裁切与长表映射；`FamilyBalanceTrendChart` 挂在总览 KPI 行右侧（C2）。

**Tech Stack:** Next.js App Router、Ant Design Segmented + @ant-design/charts Line、Supabase JS、Jest。

## Global Constraints

- 不新增 DDL；只读 `family_snapshots`
- 默认范围 `90d`；系列默认总资产+总负债，净资产图例可点出
- 桌面左 `lg=8` KPI 竖排 / 右 `lg=16` 趋势；手机上 KPI 下趋势
- 金额统一 `formatCny`

---

### Task 1: 类型 + 纯函数 + 单测

**Files:**

- Modify: `src/types/family-finance.ts`
- Create: `src/lib/family-finance/balance-trend.ts`
- Create: `__tests__/family-finance/balance-trend.test.ts`

- [x] 写失败测试：`filterBalanceSnapshots` / `toBalanceTrendSeries`
- [x] 实现类型与纯函数使测试通过

### Task 2: Repository 读快照

**Files:**

- Modify: `src/lib/supabase/family-finance-repository.ts`

- [x] 新增 `listBalanceSnapshots()`，select 四列并映射为领域类型

### Task 3: 趋势图组件 + 总览布局

**Files:**

- Create: `src/components/family/family-balance-trend-chart.tsx`
- Modify: `src/components/family/family-overview-page.tsx`
- Modify: `src/app/globals.css`

- [x] 实现 Segmented + Line + 空态
- [x] KPI 行改为 C2；reload 并行拉快照
- [x] 最小 CSS（左栏 gap、趋势卡高度）

### Task 4: 验证 + CR

- [x] `npm test -- --testPathPattern='balance-trend|format|metric-card'`
- [x] `npm run build`
- [x] code-reviewer；必要时修问题
- [x] 更新 spec 状态为已实现
