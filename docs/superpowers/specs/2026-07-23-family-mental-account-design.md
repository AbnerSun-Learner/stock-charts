# 家庭财务总览 · 心理账户

**日期**：2026-07-23  
**状态**：已实现（2026-07-23；DDL 已应用到目标库；关联口径已扩展为三笔钱）  
**相关**：[家庭财务总览设计](./2026-07-22-family-finance-overview-design.md)、[Ant Design Charts Liquid](https://ant-design-charts.antgroup.com/examples/statistics/liquid/#liquid)

## 目标

在总览「成员分布」旁设立心理账户模块：为家庭资产设立命名目标，关联 1 ～ N 笔互斥的活钱 / 稳钱 / 长钱账目，用水波图展示进度。

## 非目标

- 不改活账 / 成员 / 保单 CRUD 语义
- 不把心理账户目标计入 KPI（总资产 / 负债 / 净资产）
- 不支持关联 `insurance` 资金标签或未标注四笔钱的账目
- 不在本仓提交权威 DDL（DDL 在 `scheduled-tasks`）

## 产品决策

| 项       | 选择                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| 关联口径 | 1 ～ N 笔 `side=asset` 且 `fourPot ∈ {liquid, stable, long_term}` 的活账条目 |
| 多账户   | 允许；同一账目互斥（仅归属一个心理账户）                                     |
| 名称     | 必填（trim 后非空，长度 ≤32）                                                |
| 布局     | 成员分布 `Col lg=12` 旁再设心理账户 `Col lg=12`                              |
| 超额     | 水波满格 +「已超额」文案                                                     |
| 删除     | 删心理账户不删活账；删活账 CASCADE 脱钩                                      |

## 数据模型（契约）

权威 migration：`scheduled-tasks` → `20260723_family_mental_accounts.sql`

### `family_mental_accounts`

| 列                      | 类型          | 约束                          |
| ----------------------- | ------------- | ----------------------------- |
| id                      | uuid PK       | default gen_random_uuid()     |
| user_id                 | uuid          | NOT NULL → auth.users CASCADE |
| name                    | text          | NOT NULL，trim 非空           |
| target_amount           | numeric(18,2) | NOT NULL，CHECK (> 0)         |
| target_date             | date          | NOT NULL，预期达成目标日期    |
| created_at / updated_at | timestamptz   | NOT NULL                      |

### `family_mental_account_links`

| 列                | 类型                                | 约束                                                |
| ----------------- | ----------------------------------- | --------------------------------------------------- |
| mental_account_id | uuid                                | → accounts ON DELETE CASCADE                        |
| ledger_item_id    | uuid                                | → family_ledger_items ON DELETE CASCADE；**UNIQUE** |
| user_id           | uuid                                | NOT NULL（便于 RLS，与 account 同 owner）           |
| PK                | (mental_account_id, ledger_item_id) |                                                     |

### RLS

与现有家庭表一致：`authenticated` + `auth.uid() = user_id` + `is_family_access_allowed()`。

## 进度计算

```
current = sum(仍存在且 fourPot ∈ {liquid,stable,long_term} 的关联条目.amount)
percent = target > 0 ? current / target : 0
chartPercent = min(1, max(0, percent))
overflow = max(0, current - target)
```

关联为空：`current=0`，卡片提示重新关联。

## UI

### 总览

```
[ KPI ]
[ 成员分布 Col lg=12 ] [ 心理账户 Col lg=12 ]
[ 保单 ]
```

心理账户 Card：标题 +「添加心理账户」；网格展示各账户 Liquid；空态 Empty。

### 弹窗表单

```
┌─────────────────────────────────────────────┐
│  添加心理账户                            ✕  │
├─────────────────────────────────────────────┤
│  名称 *                                     │
│  [ 如：应急金、旅游基金                   ] │
│  预期目标 *                                 │
│  [ 50000.00                          元   ] │
│  预期达成日期 *                             │
│  [ 2026-12-31                             ] │
│  关联账目 *（至少选 1 项；活钱/稳钱/长钱）   │
│  [☑ 招商活期 · 我 · 活钱 · ¥12,000.00     ] │
│  [☑ 国债 · 配偶 · 稳钱 · ¥8,500.00        ] │
│              [ 取消 ]    [ 确认 ]            │
└─────────────────────────────────────────────┘
```

可选列表：仅活钱/稳钱/长钱；排除已被其他心理账户占用的条目；编辑时保留本账户已关联项。  
无可用账目：引导去记账，确认禁用。  
水波图旁展示：百分比、当前/目标金额、**预期达成日期**、超额文案。

### 水波图

`@ant-design/charts` Liquid；`dynamic` + `ssr:false`；色 `#2563eb`；中心百分比；旁注当前/目标。

## 本仓文件

| 路径                                                     | 职责                  |
| -------------------------------------------------------- | --------------------- |
| `src/types/family-finance.ts`                            | `FamilyMentalAccount` |
| `src/lib/family-finance/mental-account.ts`               | 进度 / 可选列表纯函数 |
| `src/lib/supabase/family-finance-repository.ts`          | CRUD                  |
| `src/components/family/family-mental-account-liquid.tsx` | Liquid                |
| `src/components/family/family-mental-accounts-panel.tsx` | 列表 + Modal          |
| `src/components/family/family-overview-page.tsx`         | 旁挂载                |
| `__tests__/family-finance/mental-account.test.ts`        | 单测                  |

## 验收标准

1. 总览成员分布旁可见心理账户区
2. 可添加：名称 + 目标 + ≥1 活钱/稳钱/长钱账目 → Liquid 展示进度
3. 同一账目不可被两个心理账户同时关联
4. 可编辑 / 删除（删账户不删活账）
5. 超额时水波满格且有超额提示
6. 无可用账目时无法提交
7. 可选列表不含 insurance / 未标注条目
