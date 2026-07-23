# 家庭财务 · 心理账户 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`/`- [ ]`) syntax for tracking.

**Goal:** 总览成员分布旁设立心理账户：关联互斥的活钱/稳钱/长钱账目，Liquid 水波图展示进度。

**Architecture:** accounts + links 表（DDL 在 scheduled-tasks）；本仓纯函数算进度、Repository CRUD、Panel+Liquid UI。

**Tech Stack:** Next.js 14、Ant Design 5、@ant-design/charts Liquid、Supabase、Jest

## Global Constraints

- 本仓不提交权威 DDL；migration 文件在 `scheduled-tasks`
- 金额 numeric(18,2) / 应用层两位小数
- 关联 `fourPot ∈ {liquid, stable, long_term}`；ledger_item_id UNIQUE 互斥
- 中文 UI 文案

---

### Task 1: Spec + DDL

- [x] Spec：`docs/superpowers/specs/2026-07-23-family-mental-account-design.md`
- [x] Migration：`scheduled-tasks/.../20260723_family_mental_accounts.sql`
- [x] 在目标 Supabase 执行 migration（plugin-supabase apply_migration）

### Task 2: 纯函数 + 单测

- [x] `__tests__/family-finance/mental-account.test.ts`
- [x] `src/lib/family-finance/mental-account.ts`
- [x] 类型 `FamilyMentalAccount` 等

### Task 3: Repository

- [x] `listMentalAccounts` / `upsertMentalAccount` / `deleteMentalAccount`

### Task 4: UI

- [x] `family-mental-account-liquid.tsx`
- [x] `family-mental-accounts-panel.tsx`
- [x] `family-overview-page.tsx` 旁挂载

### Task 5: 验证

- [x] `npm test`（family-finance / mental-account passed）/ `npm run build` 通过
- [x] 浏览器：`/view/family` 路由可加载（需登录后验心理账户交互）
- [x] Supabase migration `family_mental_accounts` 已 apply
- [x] code-reviewer CR（无 Critical；Important 已修：差量 links、创建回滚、roundMoney、编辑过滤、Select 常驻）
