# 心理账户优先级与目标总览 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为心理账户增加 P0/P1/P2 优先级与必填开始日期，列表按优先级分组瀑布流展示，右侧分组柱状图对照目标合计 vs 已达成，保单下移全宽。

**Architecture:** `scheduled-tasks` 增列并回填；本仓扩展类型与纯函数（聚合/分组/日期校验），Repository 读写新字段；面板改为左瀑布流 + 右 Column；总览去掉心理账户|保单半宽并排。

**Tech Stack:** Next.js 14、Ant Design 5、@ant-design/charts Column、Supabase JS、Jest、dayjs

## Global Constraints

- DDL 只落在 `scheduled-tasks`，本仓不提交权威 migration
- `priority ∈ {P0,P1,P2}`；新建默认 P1；存量回填 P1
- `start_date` 必填；存量回填 migration 执行日；`start_date ≤ target_date`
- 模块内布局：左 `lg=16` 列表、右 `lg=8` 图；总览：心理账户整行 → 保单全宽
- 无账户时柱状图仍渲染 P0/P1/P2 三组 0 柱
- 不把心理账户目标计入 KPI

## File Structure

| 文件 | 职责 |
| --- | --- |
| `scheduled-tasks/.../20260724_family_mental_accounts_priority_start_date.sql` | 增列 + 回填 + CHECK |
| `src/types/family-finance.ts` | `MentalAccountPriority`、字段扩展、聚合结果类型 |
| `src/lib/family-finance/mental-account.ts` | 校验、分组、聚合纯函数 |
| `src/lib/supabase/family-finance-repository.ts` | 读写与排序 |
| `src/components/family/family-mental-goals-bar-chart.tsx` | 分组柱状图 |
| `src/components/family/family-mental-accounts-panel.tsx` | 表单 + 左列表右图 |
| `src/components/family/family-mental-account-liquid.tsx` | 展示开始日期 |
| `src/components/family/family-overview-page.tsx` | 保单下移全宽 |
| `src/app/globals.css` | 瀑布流 / 左右栏样式 |
| `__tests__/family-finance/mental-account.test.ts` | 纯函数单测 |

---

### Task 1: DDL（scheduled-tasks）

**Files:**
- Create: `/Users/abnersun/Downloads/code/scheduled-tasks/src/scheduled_tasks/models/migrations/20260724_family_mental_accounts_priority_start_date.sql`

- [ ] **Step 1: 写入幂等 migration**

```sql
-- 心理账户：优先级 + 开始日期
-- 幂等：可重复执行

alter table public.family_mental_accounts
  add column if not exists priority text;

alter table public.family_mental_accounts
  add column if not exists start_date date;

update public.family_mental_accounts
set priority = 'P1'
where priority is null;

update public.family_mental_accounts
set start_date = least(
  (current_timestamp at time zone 'Asia/Shanghai')::date,
  target_date
)
where start_date is null;

alter table public.family_mental_accounts
  alter column priority set not null;

alter table public.family_mental_accounts
  alter column start_date set not null;

alter table public.family_mental_accounts
  drop constraint if exists family_mental_accounts_priority_check;

alter table public.family_mental_accounts
  add constraint family_mental_accounts_priority_check
  check (priority in ('P0', 'P1', 'P2'));

alter table public.family_mental_accounts
  drop constraint if exists family_mental_accounts_start_before_target_check;

alter table public.family_mental_accounts
  add constraint family_mental_accounts_start_before_target_check
  check (start_date <= target_date);

comment on column public.family_mental_accounts.priority is
  '心理账户优先级：P0 / P1 / P2';

comment on column public.family_mental_accounts.start_date is
  '心理账户开始日期（YYYY-MM-DD），须 ≤ target_date';
```

- [ ] **Step 2: 应用到目标库**（Supabase MCP `apply_migration` 或用户本地执行；本仓不提交该 SQL）

- [ ] **Step 3: Commit（scheduled-tasks 仓）**

```bash
cd /Users/abnersun/Downloads/code/scheduled-tasks
git add src/scheduled_tasks/models/migrations/20260724_family_mental_accounts_priority_start_date.sql
git commit -m "feat(family): 心理账户增加优先级与开始日期"
```

---

### Task 2: 类型 + 纯函数（TDD）

**Files:**
- Modify: `src/types/family-finance.ts`
- Modify: `src/lib/family-finance/mental-account.ts`
- Modify: `__tests__/family-finance/mental-account.test.ts`

**Interfaces:**
- Produces:
  - `export type MentalAccountPriority = 'P0' | 'P1' | 'P2'`
  - `export const MENTAL_ACCOUNT_PRIORITIES: MentalAccountPriority[] = ['P0','P1','P2']`
  - `FamilyMentalAccount.priority` / `.startDate`
  - `export interface MentalGoalPriorityAggregate { priority: MentalAccountPriority; targetSum: number; currentSum: number }`
  - `isValidMentalAccountPriority(value: string): value is MentalAccountPriority`
  - `assertMentalAccountDateRange(startDate: string, targetDate: string): void`（非法抛 Error）
  - `groupMentalAccountsByPriority(accounts: FamilyMentalAccount[]): { priority: MentalAccountPriority; accounts: FamilyMentalAccount[] }[]`（空组不返回；组内按 targetDate ASC）
  - `aggregateMentalGoalsByPriority(accounts, items): MentalGoalPriorityAggregate[]`（固定三档，无账户为 0）

- [ ] **Step 1: 扩展测试夹具与新用例（先失败）**

`account()` 默认补 `priority: 'P1'`, `startDate: '2026-01-01'`。

新增用例覆盖：
- `assertMentalAccountDateRange`：相等通过；开始晚于达成抛错
- `groupMentalAccountsByPriority`：顺序 P0→P1→P2；空组省略；同组按 targetDate
- `aggregateMentalGoalsByPriority`：空列表三档 0；混合优先级合计；超额 current 仍计入

- [ ] **Step 2: 跑测确认失败**

```bash
npm test -- --testPathPattern=mental-account.test
```

Expected: FAIL（新函数未定义）

- [ ] **Step 3: 实现类型与纯函数**

- [ ] **Step 4: 跑测通过**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(family): 心理账户优先级聚合与日期校验纯函数"
```

---

### Task 3: Repository 读写

**Files:**
- Modify: `src/lib/supabase/family-finance-repository.ts`

**Interfaces:**
- Consumes: `isValidMentalAccountPriority`, `assertMentalAccountDateRange`, `MentalAccountPriority`
- Produces: `listMentalAccounts` 映射 `priority`/`startDate`；排序 `priority ASC, target_date ASC`；`upsertMentalAccount` 入参含 `priority`/`startDate`

- [ ] **Step 1: 更新 map / upsert / saveMentalAccountRow**

校验：
- priority 枚举
- startDate / targetDate `YYYY-MM-DD`
- `assertMentalAccountDateRange(startDate, targetDate)`

payload 增加 `priority`、`start_date`。

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(family): Repository 读写心理账户优先级与开始日期"
```

---

### Task 4: 分组柱状图组件

**Files:**
- Create: `src/components/family/family-mental-goals-bar-chart.tsx`

**Interfaces:**
- Consumes: `aggregateMentalGoalsByPriority` 或预聚合 `MentalGoalPriorityAggregate[]`
- Produces: `FamilyMentalGoalsBarChart({ aggregates, height? })`

- [ ] **Step 1: 实现 Column**

长表：`{ priority, type: '目标合计'|'已达成', amount }`；色 `#0052ff` / `#7c828a`；Y 轴 compact；Tooltip `formatCny` + 完成率；始终有 6 个点（3×2）。

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(family): 新增心理账户优先级目标柱状图"
```

---

### Task 5: 面板表单 + 左列表右图 + Liquid

**Files:**
- Modify: `src/components/family/family-mental-accounts-panel.tsx`
- Modify: `src/components/family/family-mental-account-liquid.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Liquid 增加 `startDate` 展示行「开始日期」**

- [ ] **Step 2: 表单增加 priority Select、startDate DatePicker**

默认：新建 `priority=P1`、`startDate=today`；校验 start≤target（依赖表单联动 validator）。

- [ ] **Step 3: Card body 改为 Row：左 Col lg=16 分组瀑布流，右 Col lg=8 柱状图**

组头 `P0`/`P1`/`P2` + 数量；组内 CSS columns 瀑布流；卡片标题旁 Tag 显示优先级。

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(family): 心理账户表单与分组瀑布流布局"
```

---

### Task 6: 总览保单下移全宽

**Files:**
- Modify: `src/components/family/family-overview-page.tsx`

- [ ] **Step 1: 心理账户 `Col xs={24}` 整行；保单单独下一行 `Col xs={24}`**

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(family): 总览心理账户整行保单下移"
```

---

### Task 7: 验证 + CR

- [ ] **Step 1:** `npm test -- --testPathPattern=family-finance`
- [ ] **Step 2:** `npm run build`
- [ ] **Step 3:** 浏览器打开 `/view/family` 冒烟（登录态）
- [ ] **Step 4:** 派发 code-reviewer；额度不足则用 `cursor-grok-4.5-high` 重跑
- [ ] **Step 5:** 更新 spec 状态为「已实现」并 commit docs

---

## Spec Coverage Checklist

| Spec 项 | Task |
| --- | --- |
| priority / start_date DDL + 回填 | 1 |
| 类型与聚合纯函数 | 2 |
| Repository | 3 |
| 分组柱状图 | 4 |
| 表单 + 瀑布流 + 开始日展示 | 5 |
| 保单全宽下移 | 6 |
| 测试与验证 | 2, 7 |
