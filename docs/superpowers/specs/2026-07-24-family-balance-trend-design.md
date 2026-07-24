# 家庭财务总览 · 资产负债趋势（KPI 并入）

**日期**：2026-07-24  
**状态**：已实现（2026-07-24）  
**相关**：[家庭财务总览设计](./2026-07-22-family-finance-overview-design.md)、[Coinbase UI 刷新](./2026-07-23-family-finance-coinbase-ui-refresh-design.md)

## 目标

在 `/view/family` 总览将「总资产 / 总负债」日序列双折线**并入 KPI 区**（C2：左 KPI、右趋势），便于一眼对照当前数字与近期走势。

## 非目标

- 不新增权威 DDL / 不新建负债历史表（本仓禁止；见双仓边界）
- 不改 `refresh_family_daily_snapshot` 触发器语义
- 不扩展 `family_asset_history`（该视图仍是成员 × 三笔钱资产投影）
- 不在记账页重复放家庭合计趋势图
- 不做导出、基准线、事件标注

## 产品决策

| 项           | 选择                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------- |
| 路由         | `/view/family` 总览                                                                       |
| 布局（桌面） | 左 KPI 竖排三卡（`lg=8`），右趋势卡（`lg=16`）                                            |
| 布局（手机） | 上：三张 KPI 堆叠；下：趋势卡通栏                                                         |
| 数据源       | 直读 `family_snapshots`（`as_of_date`、`total_assets`、`total_liabilities`、`net_worth`） |
| 时间范围     | 可切换：近 90 天 / 近 1 年 / 全部；**默认近 90 天**                                       |
| 系列         | 默认显示总资产 + 总负债；净资产默认隐藏，图例点选显示/隐藏                                |
| 空活账       | 维持现有大空态，不渲染 KPI+趋势行                                                         |
| 金额文案     | 统一 `formatCny`（负数为 `- ¥…`）                                                         |

## 布局示意

```
桌面
┌──────────────────┬────────────────────────────┐
│ ● 总资产          │ 资产负债趋势                 │
│ ● 总负债          │ [近90天|近1年|全部]          │
│ ● 净资产          │ 双折线（+ 可选净资产）        │
└──────────────────┴────────────────────────────┘
↓ 资产结构桑基 → 心理账户 | 保单（不变）

手机
[KPI × 3 竖排]
[趋势卡通栏]
```

## 数据流

```
活账 CRUD
  → DB trigger refresh_family_daily_snapshot
  → family_snapshots / family_snapshot_items（已有）

总览 reload
  → listLedgerItems / listMembers / listMentalAccounts
  → listBalanceSnapshots()  // 新增：直读 family_snapshots

前端
  → filterBalanceSnapshots(points, '90d'|'1y'|'all')
  → toBalanceTrendSeries(points)  // 长表 date/type/amount
  → FamilyBalanceTrendChart
```

说明：负债已随快照落库（表头合计 + `snapshot_items.side='liability'`）。本需求只需**读**日汇总，不另建落表链路。`family_asset_history` 仍只服务记账页成员三笔钱图。

## 本仓文件（拟）

| 路径                                                   | 职责                                |
| ------------------------------------------------------ | ----------------------------------- |
| `src/types/family-finance.ts`                          | `FamilyBalanceSnapshot` 等类型      |
| `src/lib/family-finance/balance-trend.ts`              | 范围过滤、长表映射纯函数            |
| `src/lib/supabase/family-finance-repository.ts`        | `listBalanceSnapshots()`            |
| `src/components/family/family-balance-trend-chart.tsx` | Segmented + Line + 空态             |
| `src/components/family/family-overview-page.tsx`       | KPI 行改为 C2 左右栏并拉快照        |
| `__tests__/family-finance/balance-trend.test.ts`       | 纯函数单测                          |
| `src/app/globals.css`                                  | 趋势卡高度、左栏 KPI 间距等最小样式 |

## 交互细节

- 范围切换仅前端裁切，不重新请求
- 窗口内无点、但全部历史有点：展示「该范围内暂无数据」（可切「全部」）
- 仅 1 个快照点：仍渲染（单点），不强制空态
- 图表高度约 220–280px，服务 KPI 附属视觉，不抢桑基戏份
- Y 轴 compact；Tooltip 用 `formatCny`
- 色板：总资产 primary 蓝、总负债中性灰、净资产与现有 positive 绿对齐（系列固定色，不随正负变色）

## 测试

- `filterBalanceSnapshots`：90d / 1y / all 边界日
- `toBalanceTrendSeries`：三点映射为三条 type 长表
- 组件/源码契约：默认范围 90 天；空态文案存在
- 不强制 E2E

## 双仓协作

- 本仓：只读 `family_snapshots` + UI
- 若后续需要对称视图名（如 `family_balance_history`），再在 `scheduled-tasks` 补 migration；**本期不做**
