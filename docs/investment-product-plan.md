# ETF 投资工具能力补齐方案

> **文档说明**：本文件由 `~/Downloads/PLAN.md` 迁入仓库，作为 ETF 投资驾驶舱的**唯一产品需求源**，便于 PR 与版本管理。技术落地方案见 [`etf-investment-cockpit-implementation-plan.md`](./etf-investment-cockpit-implementation-plan.md)。
>
> **产品边界**：资产配置为主、网格策略为辅。目标配置与再平衡属于资产配置主线；网格计划、成交与收益归因属于独立辅线，不参与目标配置比例计算。

## Summary

当前网站已具备两个基础能力：资产旭日图用于看配置占比，网格交易策略用于生成档位、资金压力和抗跌推演。下一阶段建议把它升级成「ETF 投资驾驶舱」，核心目标是形成闭环：

```text
资产配置主线：目标配置 -> 持仓偏离 -> 再平衡计划 -> 执行记录 -> 配置归因 -> 配置参数优化
网格策略辅线：网格标的 -> 网格计划 -> 网格执行记录 -> 网格收益归因 -> 网格参数优化
```

默认选择：手动优先、覆盖 A 股 + 港美 ETF、定位为个人投资驾驶舱。

## Key Changes

- **组合驾驶舱**：新增总览页，展示总资产、现金比例、ETF 分类占比、目标配置偏离、单标的仓位上限、币种暴露、待执行动作。
- **ETF 标的库**：为每个 ETF 记录代码、市场、资产类别、跟踪指数、费率、分红、流动性、估值标签、策略角色（核心仓、卫星仓、观察仓、现金类）。
- **目标配置与再平衡**：在资产旭日图基础上增加「目标比例、当前比例、偏离金额、建议补/减仓金额」，目标权重独立于持仓快照维护。
- **网格实盘闭环**：网格模块从「生成策略」升级为「策略计划 + 成交记录 + 当前状态」，记录每一格的计划价、触发状态、成交价、成交金额、已实现收益、剩余网格弹药。
- **风险仪表盘**：优先补齐最大回撤、波动率、现金覆盖月数、单 ETF 集中度、资产相关性、汇率暴露、估值分位、流动性风险。
- **复盘系统**：每周/月自动生成复盘模板，分栏展示资产配置归因与网格策略归因，包含组合收益、配置偏离、未执行原因、错误交易、参数调整建议。
- **决策日志**：买入/卖出/调参前预注册投资假设、验证条件与失效条件，复盘时反证「当时假设是否成立」。

## 双主线与归因口径

两条主线共享标的、持仓、成交、现金流、价格和汇率数据，但不能互相改写对方的纪律：

| 主线 | 目标 | 核心问题 | 产物 |
| --- | --- | --- | --- |
| 资产配置主线 | 长期投资 | 资产结构是否符合目标配置，是否需要再平衡 | 目标权重、持仓偏离、再平衡计划、配置归因 |
| 网格策略辅线 | 震荡市增强收益 | 指定标的的网格区间、步长、单格金额和执行是否有效 | 网格计划、网格成交、网格 vs 持有、网格参数优化 |

归因规则：

- **资产配置归因**（独立计算）：Beta 来自目标配置与基准收益；执行偏差来自偏离目标、未再平衡、现金闲置和交易成本。不能把网格收益混入配置收益。
- **网格策略归因**（独立计算）：网格 Alpha 来自网格策略相对同标的买入持有的超额；执行偏差来自漏执行档位、超计划执行、剩余弹药不足。不能把网格收益记为资产配置有效。
- 同一笔成交通过 `executionIntent`（`rebalance` / `grid` / `manual`）明确归因口径；复盘报告必须分栏呈现两条主线。

## 再平衡纪律

再平衡计划与网格计划是两个独立实体：前者服务长期配置纪律，后者服务震荡市策略收益，不能互相替代。

默认阈值（可在 `PortfolioSettings` 中调整）：

| 规则 | 默认值 | 说明 |
| --- | --- | --- |
| 相对偏离 | ±20% | 当前权重相对目标权重的偏离比例超过阈值时触发 |
| 绝对偏离 | ±5% | 当前权重与目标权重的绝对差超过阈值时触发 |
| 定期检视 | 每 90 天（季度） | 即使未超偏离阈值，也应生成检视提醒 |

触发后再平衡计划应给出：低配标的建议补仓金额、高配标的建议减仓金额、触发原因（相对偏离 / 绝对偏离 / 定期检视 / 新增资金部署）。新增外部资金优先补低配标的。执行前必须检查对应币种现金是否充足。

目标配置粒度：P0 按**标的**（`instrumentId`）维护 `targetWeight`；资产类别层权重由标的权重聚合展示，不在 P0 单独维护双层目标。

## Data & Interfaces

### 持久化方案

采用 **Supabase**（Postgres + Auth + RLS）作为持久化层：

- 用户账本数据按 `user_id` 隔离，启用 Row Level Security。
- 行情与基准（`price_bars`、`fx_rates`、`benchmarks`、`benchmark_prices`）为全局共享只读数据，不按用户复制。
- 第一阶段以 CSV/手工导入保证可控；不接券商账户，不做自动交易。
- 不在代码、文档或配置中写入真实 API Key、Token、Service Role Key。

用户账本核心表：`portfolio_settings`、`target_allocations`、`etf_instruments`、`positions`、`trade_records`、`cash_flows`、`cash_accounts`、`rebalance_plans`、`grid_plans`、`review_entries`、`decision_logs`、`portfolio_snapshots`。

### 数据优先级与不变量

| 原始事实 | 不变量 |
| --- | --- |
| 目标配置独立于持仓快照 | 导入券商快照不得覆盖用户设定的目标权重 |
| 现金流决定真实收益 | 仅外部出入金参与 XIRR；分红/费用/利息为组合内部事件 |
| 成交记录决定仓位与现金变化 | 买卖结算必须同步影响分币种现金余额 |
| 持仓只是时点快照 | 允许导入快照，但不能覆盖历史成交事实 |
| 汇率影响跨市场资产 | 港美 ETF 必须可折算到基础币种 |
| 网格计划不是配置目标 | 网格计划只服务辅策略，不参与目标权重 |
| 复盘必须能反证决策 | 决策日志必须预注册 |

### 核心数据模型

#### `PortfolioSettings`（组合级配置）

| 字段 | 说明 |
| --- | --- |
| `baseCurrency` | 基础币种（`CNY` / `HKD` / `USD`），所有折算与偏离计算的统一口径 |
| `benchmarkId` | 可选，组合基准，用于判断整体是否跑赢目标市场暴露 |
| `relativeDriftThreshold` | 相对偏离阈值，默认 `0.20`（±20%） |
| `absoluteDriftThreshold` | 绝对偏离阈值，默认 `0.05`（±5%） |
| `reviewCadenceDays` | 定期检视周期，默认 `90`（季度） |

#### `TargetAllocation`（目标配置，独立于持仓）

| 字段 | 说明 |
| --- | --- |
| `instrumentId` | 标的 ID |
| `targetWeight` | 目标权重（0–1） |
| `allocationRole` | 资产配置角色：`core` / `satellite` / `cash` / `watch`（唯一事实源；禁止用 `grid` 作为配置角色） |

`ETFInstrument.defaultAllocationRole` 仅作为新建目标配置时的默认值；持仓快照不携带角色，导入持仓不得改写角色。

#### `ETFInstrument`（ETF 标的库）

代码、名称、市场（`CN` / `HK` / `US`）、资产类别、跟踪指数、币种、费率、流动性标签、估值标签、`defaultAllocationRole`、`gridEligible`（是否允许启用网格策略）。

#### `Position`（时点持仓快照）

| 字段 | 说明 |
| --- | --- |
| `instrumentId` | 标的 |
| `asOfDate` | 快照日期 |
| `shares` | 份额 |
| `averageCost` | 平均成本 |
| `currentPrice` | 现价 |
| `marketValue` | 原币市值 |
| `currency` | 币种 |
| `fxRateToBase` | 折算基础币种的汇率 |
| `marketValueBase` | 基础币种市值 |

**注意**：`Position` 不再携带 `targetWeight`；目标权重只存在于 `TargetAllocation`。

#### `TradeRecord`（成交记录）

日期、标的、方向（`buy` / `sell`）、价格、数量、费用、税费、币种、`fxRateToBase`、`executionIntent`（`rebalance` / `grid` / `manual`）、关联的 `rebalancePlanId` / `gridPlanId` / `decisionLogId`、交易理由、`brokerRef`（券商流水号，去重优先）、`importHash`（CSV 导入去重）。

#### `CashFlow`（现金流）

| 类型 | 分类 | 参与 XIRR | 说明 |
| --- | --- | --- | --- |
| `deposit` | 外部 | 是 | 外部入金 |
| `withdrawal` | 外部 | 是 | 外部出金 |
| `dividend` | 内部 | 否 | 分红，尽量关联 `instrumentId` |
| `fee` | 内部 | 否 | 费用 |
| `tax` | 内部 | 否 | 税费 |
| `interest` | 内部 | 否 | 利息 |
| `fx_exchange` | 内部 | 否 | 换汇，必须记录双腿（入账币种/金额 + 出账币种/金额） |

公共字段：`flowDate`、`amount`、`currency`、`fxRateToBase`、`amountBase`、可选 `instrumentId`、备注。

分币种现金余额由 `cash_flows` 与 `trade_records` 共同推导；`cash_accounts` 为时点快照，用于校验而非唯一事实源。A 股、港股、美股同时存在时，现金余额必须按 CNY/HKD/USD 分开记录。

#### `GridPlan`（网格计划）

标的、基准价、最低价、总弹药、网格步长、档位明细、状态（`draft` / `active` / `paused` / `closed`）、剩余弹药。网格执行状态由计划档位与 `trade_records` 匹配得出，不能把计划档位当作已成交。

#### `RebalancePlan`（再平衡计划）

独立于 `GridPlan`。包含触发原因、目标权重快照、建议买卖明细、状态（`draft` / `active` / `completed` / `cancelled`）。

#### `DecisionLog`（预注册决策日志）

| 字段 | 说明 |
| --- | --- |
| `title` | 决策标题 |
| `hypothesis` | 投资假设（为什么做这笔操作） |
| `validationCondition` | 验证条件（什么情况下假设成立） |
| `invalidCondition` | 失效条件（什么情况下假设不成立） |
| `reviewDate` | 计划复盘日期 |
| `status` | `open` / `validated` / `invalidated` / `archived` |
| `linkedInstrumentId` | 可选，关联标的 |
| `linkedTradeId` | 可选，关联成交 |
| `linkedRebalancePlanId` | 可选，关联再平衡计划 |
| `linkedGridPlanId` | 可选，关联网格计划 |

买入、卖出、调参应尽量在操作前创建决策日志；复盘时逐条验证假设是否成立。

#### `ReviewEntry`（复盘记录）

周期起止、报告 Markdown（须分栏包含资产配置归因与网格策略归因）、创建时间。

### 导入导出

- 支持持仓 CSV 导入、成交 CSV 导入、现金流 CSV 导入。
- 支持网格表格导出、复盘 Markdown 导出。
- 成交去重：`brokerRef` 唯一优先；缺失时用 `importHash`（日期、代码、方向、价格、数量、费用、币种、行号）。
- 保证数据可迁移，不锁定在单一设备。

## Test Plan

- 用 3 类组合验证：仅 A 股 ETF、A 股 + 港股 ETF、A 股 + 美股 ETF。
- 校验资产配置：当前权重、目标偏离、再平衡金额计算必须和手工表格一致；导入持仓快照不得覆盖 `TargetAllocation`。
- 校验现金流与收益：外部出入金参与 XIRR；分红/费用只影响 TWR 与现金余额；追加资金后收益率不被污染。
- 校验网格闭环：生成计划后录入多笔买卖，已实现收益、剩余弹药、持仓成本、下一档触发价应正确更新。
- 校验双主线归因：同一组合同时有再平衡成交和网格成交时，复盘报告分栏展示，网格 Alpha 不混入配置 Beta。
- 校验决策日志：每笔调仓可关联预注册假设，复盘能标记 validated / invalidated。
- 校验异常：空数据、价格缺失、币种缺失、汇率缺失、重复成交、极端下跌、现金不足时必须有明确提示。

## Assumptions

- 先不接券商账户，避免凭证和安全复杂度。
- 先不做自动交易，只做计划、提醒、记录和复盘。
- 行情自动化作为第二阶段能力，第一阶段以手动/CSV 数据保证可控和可验证。
- 所有建议只服务于投资流程管理和自我复盘，不直接替代具体买卖决策。
