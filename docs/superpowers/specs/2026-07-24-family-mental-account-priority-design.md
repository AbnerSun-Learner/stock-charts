# 家庭财务总览 · 心理账户优先级与目标总览

**日期**：2026-07-24  
**状态**：设计中  
**相关**：[心理账户设计](./2026-07-23-family-mental-account-design.md)、[资产结构桑基](./2026-07-23-family-asset-sankey-design.md)

## 目标

为心理账户补齐 **优先级（P0/P1/P2）** 与 **开始日期**，列表按优先级分组瀑布流展示；在同一行用分组柱状图对照各优先级「目标合计 vs 已达成」，便于家庭资产目标总览。

## 非目标

- 不改 KPI（总资产 / 负债 / 净资产）语义，不把心理账户目标计入 KPI
- 不改活账 / 成员 / 保单 CRUD 语义
- 不改 `family_mental_account_links` 互斥与关联口径
- 不在本仓提交权威 DDL（DDL 在 `scheduled-tasks`）
- 不做拖拽排序、不做除分组柱状图以外的新图类型

## 产品决策

| 项 | 选择 |
| --- | --- |
| 优先级 | 枚举 `P0` / `P1` / `P2`；创建/编辑必填下拉；新建默认 `P1` |
| 历史回填 | 已有账户：`priority = P1`；`start_date = migration 执行日当天` |
| 开始日期 | 必填；新建默认今天；须 `start_date ≤ target_date` |
| 列表布局 | 分组瀑布流：P0 → P1 → P2；空组不渲染；组内多列砖墙，同组按 `target_date` 升序 |
| 目标总览图 | 分组柱状图：X 轴 P0/P1/P2；每组两柱「目标合计」「已达成」 |
| 模块内布局 | 左：水波图列表；右：柱状图（同一行，桌面并排；窄屏上下堆叠） |
| 总览页顺序 | KPI → 桑基全宽 → 心理账户整行（左列表\|右图）→ 保单全宽 |
| 列表库序 | `priority ASC`（P0→P1→P2），同优先级 `target_date ASC` |

## 数据契约

权威 migration 落在 `scheduled-tasks`（表 `family_mental_accounts` 增列 + 回填）。

### `family_mental_accounts` 新增列

| 列 | 类型 | 约束 |
| --- | --- | --- |
| `priority` | text | `NOT NULL`，`CHECK (priority IN ('P0','P1','P2'))`；回填 `'P1'` |
| `start_date` | date | `NOT NULL`；回填为 migration 执行日当天 |

应用层（Repository / 表单）校验：`start_date ≤ target_date`。migration 同步加 `CHECK (start_date <= target_date)`，与应用层一致。

### 本仓领域类型

```ts
priority: 'P0' | 'P1' | 'P2'
startDate: string // YYYY-MM-DD
```

`FamilyMentalAccount` 增上述两字段；`upsertMentalAccount` 入参同步。

## 进度与聚合

单账户进度仍用现有 `computeMentalAccountProgress`。

新增纯函数：

```
aggregateMentalGoalsByPriority(accounts, ledgerItems)
  → [{ priority, targetSum, currentSum }]  // 固定含 P0/P1/P2，无账户则为 0
```

其中 `currentSum` = 该优先级下各账户 `current` 之和；`targetSum` = `targetAmount` 之和。

## UI

### 总览布局

```
[ KPI（含趋势，若已落地）]
[ 资产结构桑基 全宽 ]
┌──────────────────────────────┬────────────────────┐
│ 左：心理账户分组瀑布流         │ 右：分组柱状图        │
│ P0 / P1 / P2 水波卡片          │ 目标合计 vs 已达成    │
└──────────────────────────────┴────────────────────┘
[ 保单 全宽 ]
```

桌面左 `lg=16`、右 `lg=8`；`xs` 时上列表、下图。

### 创建 / 编辑 Modal

字段顺序建议：

1. 名称  
2. 预期目标  
3. **优先级**（Select：P0/P1/P2，必填，新建默认 P1）  
4. **开始日期**（DatePicker，必填，新建默认今天）  
5. 预期达成日期（沿用：新建不可早于今天；编辑不限制过去）  
6. 关联账目  

校验失败（含 `start > target`）阻止提交。卡片展示优先级标签与开始日期。

### 分组柱状图

- 库：`@ant-design/charts` Column  
- 无心理账户时仍渲染 P0/P1/P2 三组 0 柱（保持轴稳定，不用 Empty 替换图）  
- Tooltip：金额（`formatCny`）+ 完成率（目标为 0 时「—」）  
- 色板对齐家庭财务现有 primary / 中性色，不引入新主题

## 数据流

```
scheduled-tasks migration
  → family_mental_accounts + priority / start_date（含回填）

总览 reload
  → listMentalAccounts()（含新字段，按 priority/target_date 排序）
  → 左：按 priority 分组 → 瀑布流 + Liquid
  → 右：aggregateMentalGoalsByPriority → Column
```

## 本仓文件（拟）

| 路径 | 职责 |
| --- | --- |
| `src/types/family-finance.ts` | `priority` / `startDate` |
| `src/lib/family-finance/mental-account.ts` | 聚合、分组排序、日期校验纯函数 |
| `src/lib/supabase/family-finance-repository.ts` | 读写新字段与排序 |
| `src/components/family/family-mental-accounts-panel.tsx` | 表单字段 + 左列表分组瀑布流 |
| `src/components/family/family-mental-goals-bar-chart.tsx` | 分组柱状图（新建） |
| `src/components/family/family-overview-page.tsx` | 心理账户整行；保单下移全宽 |
| `src/app/globals.css` | 瀑布流与左右栏最小样式 |
| `__tests__/family-finance/mental-account.test.ts` | 聚合 / 排序 / 日期校验 |

兄弟仓：`scheduled-tasks` 新增 migration（文件名由该仓惯例定，例 `20260724_family_mental_accounts_priority_start_date.sql`）。

## 错误处理

- upsert：非法 priority、非法日期、`start_date > target_date` → 抛错 / 表单提示  
- links 差量同步失败回滚逻辑保持不变  
- 关联账目失效：卡片仍提示重新关联（与现网一致）

## 测试

- `aggregateMentalGoalsByPriority`：空列表、仅一档、三档混合、超额计入 current  
- 分组排序：P0 先于 P1 先于 P2；同组 `target_date` 升序  
- `start ≤ target` 边界（相等通过，大于失败）  
- Repository / 表单字段映射冒烟（可源码契约断言）  
- 不强制 E2E

## 双仓协作

1. 本仓本 spec 定契约  
2. `scheduled-tasks` 落地 SQL 并应用到目标库  
3. 本仓接类型、Repository、UI  

共享约定：领域 `startDate` ↔ 列 `start_date`；`priority` 字面量与库内一致（大写 P + 数字）。
