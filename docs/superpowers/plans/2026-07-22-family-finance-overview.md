# 家庭财务总览 Implementation Plan

> **For agentic workers:** 按任务顺序实施；每任务含验证。规格见 `docs/superpowers/specs/2026-07-22-family-finance-overview-design.md`。

**Goal:** 交付家庭资产记账 → 总览 → 保单，GitHub OAuth + 库表白名单。

**Architecture:** 独立领域表（`user_id` RLS）；总览直读活账合计；Auth 为 GitHub OAuth Modal + `is_family_access_allowed` RPC。无快照。

**Tech Stack:** Next.js 14 App Router、Ant Design 5、`@supabase/supabase-js` + `@supabase/ssr`、Jest；资产结构饼图用 `@ant-design/charts`。

## Global Constraints

- DDL 仅在 `scheduled-tasks`；金额 `numeric(18,2)`；保额不进 KPI；资产必填 member、负债 member 为空；FK ON DELETE RESTRICT。
- 应用层不读写 `family_snapshots` / `family_snapshot_items`；drop 表另开 scheduled-tasks migration。

---

### Task 1: scheduled-tasks migration

- [x] 新增 `20260722_family_finance_ledger.sql`（allowlist 幂等对齐 + 业务表 + RLS）
- [x] 应用到目标库

### Task 2: 依赖与 Supabase 客户端 / Auth

- [x] `package.json` 声明 `@supabase/supabase-js`、`@supabase/ssr`
- [x] `client.ts`、`server.ts`、`auth.ts`、`/auth/callback`
- [x] `login-modal.tsx`、`auth-gate.tsx`、`user-menu.tsx`
- [x] 白名单：`rpc('is_family_access_allowed')`

### Task 3: 领域类型与纯函数 + 单测

- [x] `types/family-finance.ts`
- [x] `lib/family-finance/*`（合计、结构、覆盖；无月差/上海日）
- [x] Jest 覆盖关键路径

### Task 4: Repository

- [x] members / ledger / policies repositories（无 snapshots）

### Task 5: 首页分区 + Ledger UI（Phase 1）

- [x] `HomeToolCard` 抽出；家庭财务分区；投研网格
- [x] `/view/family/ledger` 页面

### Task 6: 总览（Phase 2）

- [x] `/view/family` 直读活账 KPI / 成员分布 / 保单覆盖

### Task 7: 保单（Phase 3）

- [x] `/view/family/policies`；总览覆盖摘要

### Task 8: 验证

- [x] `npm test`、`npm run build`、code-reviewer
