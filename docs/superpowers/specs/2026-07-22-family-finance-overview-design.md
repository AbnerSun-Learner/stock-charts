# 家庭财务总览 — 设计规格

> 日期：2026-07-22  
> 状态：已批准并实施（已去掉快照，总览直读活账）  
> 参考：有知有行「家庭财务总览 / 家庭资产记账 / 保单管理」

## 1. 目标与边界

独立「家庭财务」产品线：盘点家庭资产负债、保单覆盖；首页独立类别入口。

**做**：资产记账（活账）→ 总览（直读活账合计）→ 保单；GitHub OAuth + 库表白名单；单户自用。  
**不做**：快照/历史趋势、投资记账、现金流、多户/协作、Magic Link、与 ETF 持仓自动同步、跨币种（P1 默认 CNY）。

**访问边界**：投研工具仍可匿名；仅家庭财务要求 session + 白名单。

**认证**：本仓库唯一方式为 **GitHub OAuth**（不支持 Magic Link）。

## 2. 信息架构

| 路由                    | 职责                               |
| ----------------------- | ---------------------------------- |
| `/`                     | 分区：家庭财务（同款卡）+ 投研工具 |
| `/view/family`          | 总览：KPI / 成员分布 / 保单覆盖    |
| `/view/family/ledger`   | 活账编辑、资产结构图、分表条目     |
| `/view/family/policies` | 保单 CRUD + 覆盖摘要               |
| `/auth/callback`        | OAuth code 换 session              |

登录：Modal（非独立登录页）。

## 3. 硬规则摘要

- **资产按成员**：`side=asset` ⇒ `member_id NOT NULL`；**债务按家庭**：`side=liability` ⇒ `member_id IS NULL`；无「共同」伪成员。
- **保单** `member_id` 必填（被保人）；**保额不计入**资产负债 KPI。
- **四笔钱 `insurance`**：资金标签（计入净资产）；**≠** `insurance_policies` 保障台账。
- **首进 Ledger**：幂等确保 `role=self` 成员（默认名「我」）。
- **删成员 FK**：`ON DELETE RESTRICT`（禁止 CASCADE / SET NULL）。
- **总览直读活账**：条目保存后 KPI 即时反映；无快照中间层。
- **金额**：全部 `numeric(18,2)`；禁止 float/real/double。
- **白名单**：表 `family_access_allowlist` + RPC `is_family_access_allowed()`；禁止环境变量名单。

## 4. 数据模型

DDL 权威：`scheduled-tasks` → `20260722_family_finance_ledger.sql`。

应用层**不再读写**快照表；历史表可保留于库中，清理 DDL 另开 `scheduled-tasks` migration。

| 表                        | 要点                                                   |
| ------------------------- | ------------------------------------------------------ |
| `family_access_allowlist` | `github_user_id` 唯一；客户端不可读写                  |
| `family_members`          | `user_id`, name, role                                  |
| `family_ledger_items`     | CHECK asset/liability 与 member_id；金额 numeric(18,2) |
| `insurance_policies`      | coverage/premium numeric(18,2)；member_id NOT NULL     |

RPC：`is_family_access_allowed() → boolean`（SECURITY DEFINER）。

## 5. UI 草图

### 5.0 首页（独立类别 + 同款卡）

```text
── 家庭财务 ──
┌──────────┐
│ 家庭财务总览 │  ← .home-tool-card 同款
│ 立即使用    │
└──────────┘
── 投研工具 ──
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 旭日图    │ │ 网格     │ │ 持仓分析  │ │ 风险仪表  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### 5.1 登录 Modal

标题「登录以使用家庭财务」；说明仅限授权 GitHub；按钮「使用 GitHub 登录」；非白名单 → 提示并登出。

### 5.2 总览 `/view/family`

页头：标题 + [成员管理] [更新资产] [管理保单]  
KPI：总资产 / 总负债 / 净资产（活账合计）  
成员分布（半宽）；保单覆盖 ✓/○  
无条目：空态引导去记账。

### 5.3 记账 `/view/family/ledger`

组成图 | 资产表 + 负债表  
页头展示总资产 / 总负债 / 净资产；弹窗确定即写入活账。

### 5.4 保单 `/view/family/policies`

覆盖摘要 + 表格 CRUD。

### 5.5 成员 Drawer

首进至少有「我」；self 通常不可删；有引用时删失败提示改挂靠。

## 6. 分期验收

0. DDL/RLS + OAuth Modal + 白名单 RPC
1. Ledger 完整可用 + 首页分区
2. 总览直读活账 KPI / 成员分布
3. 保单 + 总览覆盖摘要

## 7. 双仓

- `scheduled-tasks`：migration / RLS（含将来 drop 快照表）
- `stock-charts`：UI、纯函数、Repository、Auth Modal
