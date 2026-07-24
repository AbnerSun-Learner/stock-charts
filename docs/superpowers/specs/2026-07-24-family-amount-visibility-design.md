# 家庭财务总览 · 金额显示 / 隐藏

**日期**：2026-07-24  
**状态**：已实现（2026-07-24）  
**相关**：[家庭财务总览设计](./2026-07-22-family-finance-overview-design.md)、[资产负债趋势](./2026-07-24-family-balance-trend-design.md)

## 目标

在 `/view/family` 总览提供用户可控的「金额显示 / 隐藏」开关：关闭时所有金额文案显示为 `****`，开启后恢复真实数字，便于在旁人可见场合快速遮挡敏感金额。

## 非目标

- 不覆盖 `/view/family/ledger`、独立打开的保单编辑流程以外的其它路由（仅总览页及其**嵌入**子树）
- 不做 `localStorage` / 服务端持久化；不做跨会话记忆
- 不模糊、不销毁图表几何（比例与形状仍可见）
- 不隐藏非金额信息（标签、日期、百分比进度、成员名等）
- 不改后端 / DDL / RLS；数据仍照常拉取，仅前端展示层遮罩
- 不把开关做成全局站点级隐私模式

## 产品决策

| 项       | 选择                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------ |
| 范围     | 总览页内所有**金额**展示（KPI、趋势图轴/tooltip、Sankey tooltip、心智账户金额、嵌入保单表保额/保费等） |
| 默认态   | **每次进入页面默认隐藏**（`amountsVisible = false`）                                                   |
| 持久化   | 无；刷新 / 重开标签                                                                                    |
| 隐藏文案 | 固定 `****`（不含 `¥`，正负号也不展示）                                                                |
| 图表     | 形状与比例保留；Y 轴标签、tooltip、卡片金额等文案走遮罩                                                |
| 百分比   | 保留（如水波图进度 `%`）；不视为金额                                                                   |
| 开关 UI  | 总览标题「家庭财务总览」旁：`EyeFilled`（显示）/ `EyeInvisibleFilled`（隐藏）；点击切换                |
| 空活账   | 无 KPI/图表金额时仍渲染开关（与 header 一并出现），行为一致                                            |

## 交互示意

```
header
┌─────────────────────────────────────────────────────────┐
│ 家庭财务总览 [👁]                      [成员管理] [更新资产] │
└─────────────────────────────────────────────────────────┘

关（默认）
  KPI 值 → ****
  趋势 Y 轴 / tooltip → ****
  Sankey 节点标签 / tooltip 金额 → ****
  心智账户「当前/目标/超额」→ ****
  嵌入保单表 保额/保费 → ****

开
  上述全部恢复 formatCny / compact 金额
```

## 架构

```
FamilyOverviewPage
  useState(amountsVisible=false)
  Switch → setAmountsVisible
  <FamilyAmountVisibilityProvider value={amountsVisible}>
    MetricCard / BalanceTrend / Sankey / MentalAccounts / Policies(embedded)
  </Provider>

format.ts
  MASKED_AMOUNT = '****'
  formatCny(amount, { visible?: boolean })  // visible===false → MASKED_AMOUNT
  formatCompactCny(...) 同理（若抽公共）

子组件
  useFamilyAmountVisibility() 或接收 visible
  所有金额 formatter 传入 visible
```

原则：

1. **单一真相**：可见性只存在于总览页 state + Context，不散落多处默认值。
2. **格式化入口收敛**：优先扩展 `formatCny`（及趋势图 compact formatter）支持 `visible`；禁止仅用 CSS blur。
3. **渲染即遮罩**：隐藏时 DOM 文本为 `****`，而非真实数字再盖样式。

## 遮罩范围清单（总览）

| 区域         | 组件                                                     | 遮罩字段                                        |
| ------------ | -------------------------------------------------------- | ----------------------------------------------- |
| KPI          | `FamilyFinanceMetricCard`                                | 主金额                                          |
| 资产负债趋势 | `FamilyBalanceTrendChart`                                | Y 轴 `labelFormatter`、tooltip 金额             |
| 资产结构     | `FamilyAssetSankey`                                      | 节点标签金额 + tooltip / valueFormatter         |
| 心智账户     | `FamilyMentalAccountLiquid`、`FamilyMentalGoalsBarChart` | 当前/目标/超额；柱图轴与 tooltip；进度 `%` 不遮 |
| 嵌入保单     | `FamilyPoliciesPage` embedded                            | 保额、年缴保费列                                |

不在本期：记账页表格金额、独立 `/view/family/policies` 若与嵌入共用组件则**共用同一 hook**——仅当 Provider 存在时生效；无 Provider 时默认 **显示**（子路由不强制隐藏）。

## 本仓文件（拟）

| 路径                                                           | 职责                                    |
| -------------------------------------------------------------- | --------------------------------------- |
| `src/lib/family-finance/format.ts`                             | `MASKED_AMOUNT`；`formatCny` 支持可见性 |
| `src/components/family/family-amount-visibility.tsx`           | Context + Provider + hook               |
| `src/components/family/family-overview-page.tsx`               | Switch + Provider 包裹                  |
| `src/components/family/family-finance-metric-card.tsx`         | 读可见性                                |
| `src/components/family/family-balance-trend-chart.tsx`         | 轴/tooltip 遮罩                         |
| `src/components/family/family-asset-sankey.tsx`                | tooltip 遮罩                            |
| `src/components/family/family-mental-account-liquid.tsx`       | 金额遮罩                                |
| `src/components/family/family-policies-page.tsx`               | 金额列遮罩（有 Provider 时）            |
| `__tests__/family-finance/format.test.ts`                      | 遮罩与可见分支                          |
| `__tests__/family-finance/metric-card.test.ts`                 | 隐藏态渲染 `****`                       |
| 必要时 `__tests__/family-finance/amount-visibility-ui.test.ts` | header Switch 源码/静态契约             |

## 错误与边界

- `loading` 骨架：不提前泄露金额（现有 Card loading 已满足）。
- 负数 / 零：隐藏态一律 `****`，不根据符号变长。
- 无 Provider：`useFamilyAmountVisibility()` 返回 `true`（向后兼容 ledger 等）。

## 测试

- `formatCny(n, { visible: false }) === '****'`；`visible: true` / 缺省与现网一致（含负数 `- ¥…`）
- MetricCard：隐藏态含 `****`、不含 `¥123…`
- 源码契约：总览 header 含显示金额 Switch；默认 state 为隐藏
- 不强制 E2E

## 双仓协作

无。纯本仓 UI / 纯函数。
