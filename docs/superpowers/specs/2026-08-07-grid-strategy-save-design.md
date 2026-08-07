# 网格策略云端保存：表契约与安全设计

> 日期：2026-08-07  
> 范围：`/view/grid` 账号云端保存；跨仓数据契约  
> 状态：待实现（计划：`docs/superpowers/plans/2026-08-07-grid-strategy-save.md`）

## 1. 目标与边界

### 1.1 目标

为公开网格计算器增加「命名策略 + 结果快照」的账号云端保存能力：创建、打开、覆盖更新、改名、删除；打开旧策略时不自动用新算法重算。

### 1.2 双仓职责

| 仓库 | 职责 |
| --- | --- |
| `stock-charts` | 本 spec；类型/Repository/UI；经 Auth + RLS 的用户 CRUD |
| `scheduled-tasks` | 权威 migration、`doc/supabase-schema.md` 收录 |

实施顺序：**本仓 spec → `scheduled-tasks` migration/文档 → 本仓 Repository/UI**。

### 1.3 不复用 `grid_plans`

`public.grid_plans` 属于驾驶舱交易执行账本：强制 `instrument_id`、带 `draft/active/paused/closed` 生命周期，并被 `trade_records` / `decision_logs` 外键引用。本功能保存的是计算器配置与历史结果快照，使用独立表 `public.grid_strategies`。

### 1.4 非目标

分享链接、版本历史、另存为、自动保存、跨账号协作、localStorage 长期保存、搜索/分页/批量管理、打开旧快照时自动重算。

## 2. 物理表：`public.grid_strategies`

| 字段 | 类型与约束 |
| --- | --- |
| `id` | `uuid primary key default gen_random_uuid()` |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` |
| `name` | `text not null`，`char_length(btrim(name)) between 1 and 50` |
| `schema_version` | `integer not null default 1`，本期 `check (schema_version = 1)` |
| `config` | `jsonb not null`，`jsonb_typeof(config) = 'object'` |
| `result_snapshot` | `jsonb not null`，`jsonb_typeof(result_snapshot) = 'object'` |
| `created_at` | `timestamptz not null default now()` |
| `updated_at` | `timestamptz not null default now()`；改名/覆盖时由客户端显式刷新 |

索引：

- 唯一：`(user_id, lower(btrim(name)))` — 同用户忽略大小写与首尾空白唯一。冲突示例：`StrategyA` 与 ` strategya `。
- 列表：`(user_id, updated_at desc)`。

权威 migration：`scheduled-tasks` → `src/scheduled_tasks/models/migrations/20260807_grid_strategies.sql`。

## 3. JSONB 契约（schema v1）

应用层类型以 `stock-charts` 的 `GridStrategyConfigV1` / `GridRunResult` 为准；写入前必须通过严格解析。

`config`（object）：

- `params`：完整 `GridParams`（17 个有限数值字段 + `budgetMode: auto|manual`）
- `dynamicGridEnabled`：boolean
- `dynamicGridMode`：`stable` | `aggressive`

`result_snapshot`（object）：成功计算结果快照；要求非空 `gridData`/`legs`/`aggregatedRows`、`stressTest` 非 null、`calculationErrors` 为空数组。失败结果不得入库。

## 4. 版本演进

本期数据库 CHECK 仅允许 `schema_version = 1`，与应用层对未知版本的防御性拒绝一致。

引入 v2 时顺序固定：

1. 部署具备 v2 读取能力的客户端；
2. migration 放宽或替换 `grid_strategies_schema_version_check`；
3. 再启用 v2 写入。

不得只改应用常量而保留硬 CHECK。

## 5. 权限与 RLS

- 先 `revoke all` 自 `public`、`anon`、`authenticated`，再仅 `grant select, insert, update, delete` 给 `authenticated`。
- 启用 RLS；四类 policy 均 `to authenticated`，条件为 `(select auth.uid()) = user_id`（update 同时带 `using` 与 `with check`）。
- **不走**家庭财务白名单；不创建 `security definer`；不依赖可写 `user_metadata`。
- 浏览器不得使用 service role key。

## 6. 产品侧鉴权（摘要）

- 网格计算保持公开。
- 保存与「我的策略」使用 GitHub OAuth session（`getBrowserSession`），不调用 `checkFamilyAccess`。
- 未登录保存 / 打开策略库分别用 `sessionStorage` 意图键（30 分钟过期、互斥），OAuth 回跳后恢复。

## 7. 验收要点

- `anon` / `public` 无表权限；匿名读写被拒。
- 用户 A/B 互不可见、不可改删对方记录。
- 同用户 `StrategyA` 与 ` strategya ` 唯一冲突；不同用户可同名。
- Supabase advisors 不因本表新增 `rls_disabled` / 缺 policy / 未索引 FK 类告警。
