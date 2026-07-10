# ETF 投资驾驶舱代码落地方案

## 1. 现状与背景

### 1.1 业务背景

当前项目是一个基于 Next.js App Router 的投资研究工具集，已有两个独立工具：

- 资产旭日图：手工录入分类持仓金额，生成资产配置占比图。
- 网格交易策略：输入网格参数，生成网格档位、资金压力和策略对照结果。

下一阶段目标是把工具集升级为“ETF 投资驾驶舱”，形成可复盘的投资闭环：

```text
资产配置主线：目标配置 -> 持仓偏离 -> 再平衡计划 -> 执行记录 -> 配置归因 -> 配置参数优化
网格策略辅线：网格标的 -> 网格计划 -> 网格执行记录 -> 网格收益归因 -> 网格参数优化
```

其中资产配置是长期投资主框架，回答“资产结构是否合理、是否需要再平衡”；网格策略是震荡市增强收益的独立辅策略，回答“某个标的在给定区间内的网格参数和执行是否有效”。两条线共享标的、持仓、成交、现金流、价格和汇率数据，但网格策略不参与目标配置比例计算，也不能替代再平衡计划。

### 1.2 当前代码事实

| 模块       | 当前文件                                                                 | 当前能力                             | 后续定位                                             |
| ---------- | ------------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------- |
| 首页入口   | `src/app/page.tsx`、`src/components/home/home-tool-grid.tsx`             | 展示工具卡片入口                     | 新增 ETF 驾驶舱、复盘入口                            |
| 资产旭日图 | `src/app/view/sunburst/page.tsx`、`src/utils/calculate-position-tree.ts` | 手工金额录入、分类汇总、图表导出     | 作为组合配置可视化的一部分                           |
| 网格策略   | `src/app/view/grid/page.tsx`、`src/lib/grid/*`、`src/types/grid*.ts`     | 生成网格计划、压力测试、买入持有对照 | 作为独立辅策略接入账本和复盘，不参与目标配置比例计算 |
| 测试体系   | `__tests__/**/*.test.ts`、`e2e/*.spec.ts`                                | Jest 单测、Playwright E2E            | 每阶段补单测，涉及 UI 时补 E2E                       |

### 1.3 明确边界

本方案的产品需求以 [`docs/investment-product-plan.md`](./investment-product-plan.md) 为准（由 `~/Downloads/PLAN.md` 迁入），覆盖其中定义的组合管理、数据持久化、执行记录和复盘能力，并按“资产配置为主、网格策略为辅”的产品边界落地。

不做以下事项：

- 不修改、不依赖 `docs/grid-strategy-design.md`。
- 不把网格计算器升级任务混入本路线图。
- 不接券商账户，不做自动交易。
- 不在代码、文档或配置中写入真实 API Key、Token、Service Role Key。
- 不在未经确认的情况下修改 `package.json` 或 `package-lock.json`。
- **不在本仓库创建/维护 DDL、migration、第三方行情/汇率数据源客户端，或共享表的批量落库逻辑**（统一收敛到 `scheduled-tasks`，见 §1.4）。

### 1.4 双仓职责边界（强制）

本仓库与同级目录的 **`scheduled-tasks`** 仓库（GitHub Actions 定时同步仓，本地常见路径 `../scheduled-tasks`）共用同一 Supabase Postgres，职责必须严格分离：

| 职责                            | `scheduled-tasks`                                                  | `stock-charts`（本仓库）                                                    |
| ------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| 建表 / migration / `schema.sql` | **唯一归属**：用户账本表、`fx_rates`、共享行情表变更、RLS 策略 SQL | **禁止**新增 `docs/supabase-schema.sql`、`supabase/migrations/*` 或等价 DDL |
| 第三方数据源接入                | **唯一归属**：yfinance、Frankfurter/ECB 等；密钥只进该仓 Secrets   | **禁止**内嵌行情/汇率 API Key 或直连第三方拉数                              |
| 共享表落库（批量写）            | **唯一归属**：`etf_daily`、`fx_rates`、`sync_runs` 等由 job 写入   | **禁止**客户端/服务端批量 upsert 共享行情；只读                             |
| 用户账本读写                    | 不写业务 CRUD                                                      | **本仓负责**：经 `@supabase/supabase-js` + Auth/RLS 读写账本（UI/CSV）      |
| 业务计算与 UI                   | 不涉及                                                             | **本仓负责**：纯函数、驾驶舱、复盘、导入校验                                |
| 认证方式（已确认）              | —                                                                  | **邮箱 Magic Link**（Phase 1；暂不做 OAuth）                                |

协作约定：

1. 本仓 Phase 1 需要新表时：在实现计划中写清**表契约**（字段、索引、RLS 意图），由 `scheduled-tasks` 落地 SQL 与（如需）同步 job；本仓只接 Repository 读/写调用。
2. 共享行情/汇率以 `scheduled-tasks` 同步结果为准；本仓 CSV 导入仅作**账本侧**（成交、持仓、现金流）或汇率**应急补洞**，不得成为共享表主路径。
3. 本仓文档可引用 `scheduled-tasks` 的 `schema.sql` / `doc/supabase-schema.md`，不复制维护第二份权威 DDL。

#### 落地进度（2026-07-10 确认）

| 项                                | 状态                                         | 位置（`scheduled-tasks`）                                          |
| --------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| 账本 12 表 + `fx_rates` DDL + RLS | **已落地（待对目标库执行）**                 | `models/migrations/20260710_cockpit_ledger_and_fx_rates.sql`       |
| Frankfurter 汇率同步 job          | **已落地**                                   | `jobs/sync_fx_rates_frankfurter.py` + workflow `sync-fx-rates.yml` |
| 本仓业务代码 / Magic Link UI      | **未开始**（先 scheduled-tasks，本仓暂不动） | —                                                                  |

对目标库执行：

```bash
psql "$DATABASE_URL" -f src/scheduled_tasks/models/migrations/20260710_cockpit_ledger_and_fx_rates.sql
```

然后在 Actions 手动跑 `同步汇率到 Supabase`（建议先 `full`）。

## 2. 核心痛点

### 2.1 P0 痛点

| 优先级 | 痛点                         | 具体场景                                                     | 影响                                                                   |
| ------ | ---------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| P0     | 缺少目标配置独立建模         | 目标权重写在持仓快照上，导入券商数据会冲掉长期配置目标       | 再平衡纪律无法持续，偏离计算不可信                                     |
| P0     | 缺少持久化账本               | 用户每次只能在页面里临时输入持仓和网格参数                   | 无法形成历史记录、复盘和参数迭代                                       |
| P0     | 缺少 CashFlow/XIRR/TWR 地基  | 用户追加资金后，只看资产金额变化会误判投资收益               | 收益率被出入金污染，复盘结论不可信                                     |
| P0     | 资产配置和网格策略边界未建模 | 如果把持仓偏离直接导向网格计划，会误以为网格参与资产配置目标 | 长期配置纪律和震荡市策略收益混在一起，复盘无法判断问题来自配置还是策略 |
| P0     | 网格计划和成交事实未分离     | 目前网格页只生成策略，没有保存计划、成交、剩余弹药           | 无法判断网格是否按纪律执行                                             |
| P0     | 缺少预注册决策日志           | 买入、卖出、调参后只有事后解释                               | 复盘容易变成主观叙述，无法验证假设                                     |

### 2.2 量化影响

| 指标           | 当前现象                                     | 影响                                         | 验证方式                                                |
| -------------- | -------------------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| 复盘可追溯率   | 计划、成交、现金流未结构化保存               | 无法重建任意周期的组合状态                   | 导入一段历史成交后检查是否可生成周期报告                |
| 收益率可信度   | 缺少 CashFlow，无法区分收益和追加资金        | XIRR/TWR 无法计算                            | 用手工样例对比计算结果                                  |
| 策略边界清晰度 | 资产配置偏离和网格策略计划容易被串成一条流程 | 复盘时无法判断是长期配置问题还是网格参数问题 | 用同一 ETF 同时存在目标权重和网格计划的样例验证二者独立 |
| 执行偏差识别率 | 网格计划未和成交记录匹配                     | 不知道哪些档位漏执行或超计划执行             | 用多笔成交样例验证档位匹配                              |
| 决策复盘完整度 | 决策没有验证条件和失效条件                   | 复盘无法反证                                 | 抽查每笔调仓是否关联决策日志                            |

## 3. 技术方案与指导

### 3.1 第一性原理

ETF 驾驶舱的根基不是图表，而是账本。所有图表、建议和复盘都必须从可追溯事实派生。

本产品采用双主线模型：

| 主线         | 目标           | 核心问题                                         | 产物                                           |
| ------------ | -------------- | ------------------------------------------------ | ---------------------------------------------- |
| 资产配置主线 | 长期投资       | 资产结构是否符合目标配置，是否需要再平衡         | 目标权重、持仓偏离、再平衡计划、配置归因       |
| 网格策略辅线 | 震荡市增强收益 | 指定标的的网格区间、步长、单格金额和执行是否有效 | 网格计划、网格成交、网格 vs 持有、网格参数优化 |

两条主线共享账本，但不能互相改写对方的纪律：

- 目标配置只描述资产类别或标的的长期目标权重，不因为某个标的启用网格而改变。
- 网格策略只能作用在被选择的标的上，作为执行与收益增强策略，不参与目标配置偏离计算。
- 同一笔成交可以标记为再平衡执行或网格执行，但必须通过 `executionIntent` 明确归因口径。
- 复盘必须分别回答“资产配置是否有效”和“网格策略是否有效”，不能把网格收益混入配置收益。

| 原始事实                   | 代码落点                                        | 不变量                                              |
| -------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| 目标配置独立于持仓快照     | `target_allocations` + `portfolio_settings`     | 导入券商快照不得覆盖用户设定的目标权重              |
| 现金流决定真实收益         | `cash_flows` + `calculateXirr` / `calculateTwr` | 仅外部出入金参与 XIRR；分红/费用/利息为组合内部事件 |
| 成交记录决定仓位与现金变化 | `trade_records` + `cash.ts`                     | 买卖结算必须同步影响分币种现金余额                  |
| 持仓只是时点快照           | `positions`                                     | 允许导入快照，但不能覆盖历史成交事实                |
| 汇率影响跨市场资产         | `currency` + `fx_rate_to_base`                  | 港美 ETF 必须可折算到基础币种                       |
| 网格计划不是配置目标       | `grid_plans` + `trade_records.grid_plan_id`     | 网格计划只服务辅策略，不参与目标权重                |
| 复盘必须能反证决策         | `decision_logs` + `review_entries`              | 决策日志必须预注册                                  |

### 3.2 事实源与状态派生规则

执行时必须先定义唯一事实源，避免后续页面各自维护一套状态，导致收益率、仓位和复盘结果互相打架。

| 数据                                                                      | 定位               | 可否被其它数据覆盖           | 使用边界                                            |
| ------------------------------------------------------------------------- | ------------------ | ---------------------------- | --------------------------------------------------- |
| `portfolio_settings`                                                      | 组合级配置事实源   | 用户可修改                   | 基础币种、组合基准、再平衡纪律阈值                  |
| `target_allocations`                                                      | 目标配置事实源     | 用户可修改，不被持仓快照覆盖 | 资产配置偏离、再平衡计划的目标权重                  |
| `trade_records`                                                           | 成交历史事实源     | 不可被持仓快照覆盖           | 推导份额变化、成本、分币种现金结算、再平衡/网格执行 |
| `cash_flows`                                                              | 资金流事件事实源   | 不可被资产总额覆盖           | 外部出入金、分红、费用、换汇；配合成交推导现金余额  |
| `positions`                                                               | 时点持仓快照       | 可被重新导入的更新快照替代   | 展示当前状态、校验账本推导结果、补齐券商快照        |
| `cash_accounts`                                                           | 分币种现金余额快照 | 可由账本重算后校准           | 判断现金不足、币种暴露和换汇需求                    |
| `portfolio_snapshots`                                                     | 组合估值快照       | 可重新生成                   | 生成净值曲线、最大回撤、TWR 分段收益                |
| `PriceBar`（物理表 `etf_daily`）                                          | 行情事实输入       | 可按数据源刷新               | 风险指标、回测、买入持有对照                        |
| `fx_rates`                                                                | 汇率事实输入       | 可按日期刷新                 | 跨币种折算、汇兑损益、币种暴露                      |
| `Benchmark` / `BenchmarkPrice`（物理表 `indices` / `index_daily_prices`） | 基准事实输入       | 可按日期刷新                 | Beta 归因、组合对照、策略有效性判断                 |

派生规则：

- 组合总资产、现金比例、币种暴露、配置偏离都应由 `target_allocations`、`positions`、`cash_accounts`（或账本重算现金）、`fx_rates` 派生。
- 分币种现金余额由 `cash_flows` 与 `trade_records` 共同推导：`初始余额 + 外部现金流 ± 买卖结算 ± 分红/费用/利息/换汇`。`cash_accounts` 仅作快照校验，不是唯一事实源。
- XIRR 仅使用**外部现金流**：`deposit`、`withdrawal`。`dividend`、`fee`、`tax`、`interest` 为组合内部事件，计入 TWR 与现金余额，但不作为 XIRR 的外部流入/流出。
- TWR 由 `portfolio_snapshots`（或按日重算的期末总资产）分段计算，分段边界可叠加外部出入金事件。
- 资产配置偏离只由 `target_allocations`、当前持仓市值和现金派生，不能因为某标的启用网格而改变目标权重。
- 目标配置粒度：P0/P2 默认按**标的**（`instrumentId`）维护 `targetWeight`；`assetClass` 层权重由标的权重聚合展示，不在 P0 单独维护双层目标。
- 资产配置角色（core/satellite/cash/watch）的唯一事实源是 `target_allocations.allocationRole`；`ETFInstrument.defaultAllocationRole` 仅作为新建目标配置时的默认值，持仓快照不携带角色，导入持仓不得改写角色。
- 再平衡计划和网格计划必须是两个独立实体：前者服务长期配置纪律，后者服务震荡市策略收益。
- 网格执行状态必须由 `grid_plans` 和 `trade_records` 匹配得出，不能把计划档位当作已成交，也不能把网格计划当成再平衡计划。
- 复盘报告中的每条结论必须能追溯到成交、现金流、再平衡计划、网格计划、基准价格或决策日志。
- 持仓快照与账本推导结果不一致时，产品应展示“快照差异”，不要静默覆盖历史事实。

### 3.3 选型对比

| 方案                  | 结论     | 选择理由                                                          | 代价                                         |
| --------------------- | -------- | ----------------------------------------------------------------- | -------------------------------------------- |
| Supabase + Auth + RLS | 采用     | 与路线图一致；有 Postgres、Auth、Data API；适合个人驾驶舱快速落地 | 需要环境变量、RLS、迁移和权限策略            |
| 纯 localStorage       | 不采用   | 实现快                                                            | 数据不可迁移、不可多设备同步、无法做可靠备份 |
| 自建后端 API          | 暂不采用 | 权限和业务逻辑更可控                                              | 当前阶段过重，会拖慢 P0 数据地基             |

### 3.4 目录规划

新增目录建议：

```text
src/
  app/
    view/
      cockpit/
        page.tsx
      review/
        page.tsx
  components/
    investment/
      portfolio-summary.tsx
      portfolio-settings-form.tsx
      target-allocation-form.tsx
      allocation-drift-table.tsx
      rebalance-actions.tsx
      currency-exposure.tsx
      csv-import-panel.tsx
      cash-flow-form.tsx
      market-data-import-panel.tsx
      grid-plan-status.tsx
      decision-log-form.tsx
      review-report-preview.tsx
  lib/
    investment/
      money.ts
      portfolio.ts
      cash.ts
      returns.ts
      rebalancing.ts
      csv-import.ts
      market-data.ts
      grid-execution.ts
      attribution.ts
      review-report.ts
      backtest-grid.ts
    supabase/
      client.ts
      investment-repository.ts
  types/
    investment.ts
```

新增测试建议：

```text
__tests__/
  investment/
    money.test.ts
    portfolio.test.ts
    cash.test.ts
    returns.test.ts
    rebalancing.test.ts
    csv-import.test.ts
    market-data.test.ts
    grid-execution.test.ts
    attribution.test.ts
    backtest-grid.test.ts
```

## 4. 数据模型

### 4.1 TypeScript 类型

第一步先新增 `src/types/investment.ts`，只定义领域类型，不引入 Supabase SDK。

```ts
import type {
  AggregatedGridRow,
  GridLeg,
  GridStrategyParamsV2,
} from "@/types/grid-v2";

export type Market = "CN" | "HK" | "US";
export type Currency = "CNY" | "HKD" | "USD";
export type AllocationRole = "core" | "satellite" | "cash" | "watch";
export type ExecutionIntent = "rebalance" | "grid" | "manual";
export type TradeSide = "buy" | "sell";
/** 外部现金流：仅 deposit/withdrawal 参与 XIRR */
export type ExternalCashFlowType = "deposit" | "withdrawal";
/** 内部现金流：影响现金余额与 TWR，不参与 XIRR 外部口径 */
export type InternalCashFlowType =
  | "dividend"
  | "fee"
  | "tax"
  | "interest"
  | "fx_exchange";
export type CashFlowType = ExternalCashFlowType | InternalCashFlowType;
export type DecisionStatus = "open" | "validated" | "invalidated" | "archived";
export type RebalanceTriggerReason =
  | "absolute_drift"
  | "relative_drift"
  | "calendar_review"
  | "cash_deployment";

export interface PortfolioSettings {
  id: string;
  baseCurrency: Currency;
  benchmarkId?: string;
  relativeDriftThreshold: number;
  absoluteDriftThreshold: number;
  reviewCadenceDays: number;
}

export interface TargetAllocation {
  id: string;
  /** 标的级目标权重；key 为 instrumentId */
  instrumentId: string;
  targetWeight: number;
  /** 资产配置角色的唯一事实源 */
  allocationRole: AllocationRole;
  updatedAt: string;
}

export interface ETFInstrument {
  id: string;
  symbol: string;
  name: string;
  market: Market;
  currency: Currency;
  assetClass: string;
  trackingIndex?: string;
  benchmarkId?: string;
  expenseRatio?: number;
  distributionPolicy?: string;
  liquidityTag?: string;
  valuationTag?: string;
  /** 新建目标配置时的默认角色；生效角色以 TargetAllocation.allocationRole 为准 */
  defaultAllocationRole?: AllocationRole;
  gridEligible: boolean;
}

export interface Position {
  id: string;
  instrumentId: string;
  asOfDate: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  currency: Currency;
  fxRateToBase: number;
  marketValueBase: number;
}

export interface TradeRecord {
  id: string;
  instrumentId: string;
  tradeDate: string;
  settlementDate?: string;
  side: TradeSide;
  price: number;
  quantity: number;
  fee: number;
  tax: number;
  currency: Currency;
  fxRateToBase: number;
  executionIntent: ExecutionIntent;
  rebalancePlanId?: string;
  gridPlanId?: string;
  decisionLogId?: string;
  /** 券商成交流水号；有则优先用于去重 */
  brokerRef?: string;
  /** CSV 导入行号；无 brokerRef 时参与 importHash */
  importRowIndex?: number;
  importHash?: string;
  note?: string;
}

export interface CashFlow {
  id: string;
  flowDate: string;
  type: CashFlowType;
  amount: number;
  currency: Currency;
  fxRateToBase: number;
  amountBase: number;
  /** 分红、费用等需归因到标的时使用 */
  instrumentId?: string;
  /** fx_exchange 的第二条腿：出账币种与金额 */
  counterCurrency?: Currency;
  counterAmount?: number;
  note?: string;
}

export interface CashAccount {
  id: string;
  currency: Currency;
  asOfDate: string;
  balance: number;
  fxRateToBase: number;
  balanceBase: number;
}

export interface PriceBar {
  instrumentId: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  currency: Currency;
}

export interface FxRate {
  date: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
}

export interface Benchmark {
  id: string;
  code: string;
  name: string;
  currency: Currency;
  description?: string;
}

export interface BenchmarkPrice {
  benchmarkId: string;
  date: string;
  close: number;
  currency: Currency;
}

export interface PortfolioSnapshot {
  id: string;
  asOfDate: string;
  /** 持仓市值（已折算基础币种） */
  totalMarketValueBase: number;
  /** 现金余额（已折算基础币种） */
  cashValueBase: number;
  /** 总资产 = totalMarketValueBase + cashValueBase */
  totalAssetsBase: number;
}

export interface GridPlanSnapshot {
  id: string;
  instrumentId: string;
  createdAt: string;
  status: "draft" | "active" | "paused" | "closed";
  params: GridStrategyParamsV2;
  legs: GridLeg[];
  aggregatedRows: AggregatedGridRow[];
  totalBudget: number;
  remainingBudget: number;
}

export interface RebalancePlan {
  id: string;
  createdAt: string;
  status: "draft" | "active" | "completed" | "cancelled";
  reason: string;
  triggerReason: RebalanceTriggerReason;
  /** 生成计划时从 target_allocations 复制的快照 */
  targetWeights: Record<string, number>;
  plannedTrades: RebalancePlannedTrade[];
}

export interface RebalancePlannedTrade {
  instrumentId: string;
  side: TradeSide;
  plannedAmountBase: number;
}

export interface DecisionLog {
  id: string;
  createdAt: string;
  title: string;
  hypothesis: string;
  validationCondition: string;
  invalidCondition: string;
  reviewDate: string;
  status: DecisionStatus;
  linkedInstrumentId?: string;
  linkedTradeId?: string;
  linkedRebalancePlanId?: string;
  linkedGridPlanId?: string;
}

export interface ReviewEntry {
  id: string;
  periodStart: string;
  periodEnd: string;
  reportMarkdown: string;
  createdAt: string;
}
```

### 4.2 Supabase 表

#### 决策：共享行情适配现表（2026-07-10）

Supabase 中已有 A 股 ETF/指数研究库。**不新建**与现表同义的 `price_bars`、`benchmarks`、`benchmark_prices`，避免双写。领域类型（`PriceBar`、`Benchmark` 等）保持不变；持久化层映射到现有物理表。

| 领域实体                  | 物理表（已有 / DDL 状态）      | 映射要点                                                                                                                       |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `PriceBar`                | **已有** `etf_daily`           | `etf_code`→`instrumentId`，`trade_date`→`date`；回测优先 `open_qfq/high_qfq/low_qfq/close_qfq`，缺则用原始 OHLC；`volume` 可选 |
| `ETFInstrument`（共享池） | **已有** `etf_pool_snapshots`  | 只读主数据；默认 `market=CN`、`currency=CNY`；`tracking_index_code`→`benchmarkId`                                              |
| `Benchmark`               | **已有** `indices`             | `code`/`name`；币种默认 CNY                                                                                                    |
| `BenchmarkPrice`          | **已有** `index_daily_prices`  | 仅有 `close`；无 open/high/low                                                                                                 |
| `FxRate`                  | **已建 DDL** `fx_rates`        | 物理列 `rate_date` ↔ 领域 `date`；`sync_fx_rates_frankfurter` 落库，本仓只读                                                   |
| 用户侧标的扩展            | **已建 DDL** `etf_instruments` | 用户自选/池外标的；池内标的优先引用 `etf_pool_snapshots`，不复制日 K；业务行由本仓 UI 写入                                     |

已知数据缺口（不阻塞「适配现表」决策，但影响后续阶段）：

- 跟踪指数：约半数池内 ETF 缺 `tracking_index_code`；`399976.SZ`、`931071.CSI` 不在 `indices`。
- 指数行情截止日可能滞后于 `etf_daily`（评估时指数约到 2026-05-22，ETF 到 2026-07-09）。
- 代码形态：库内多为 `510300`，领域规范为 `510300.SH`；由 `market-data.ts` 做双向标准化，不强制改库内主键。
- 当前池仅为 A 股上市 ETF（含 QDII）；港美原生代码（`VOO.US` 等）不在池内。

核心表（用户账本，必须 `user_id` + RLS，**DDL 已在 `scheduled-tasks` migration `20260710_…`；业务数据仍由本仓 UI 写入**）：

- `portfolio_settings`
- `target_allocations`
- `etf_instruments`（用户扩展/自选；共享主数据见上表）
- `positions`
- `trade_records`
- `cash_flows`
- `cash_accounts`
- `rebalance_plans`
- `grid_plans`
- `review_entries`
- `decision_logs`
- `portfolio_snapshots`

共享行情与汇率（**不按用户复制**）：

- **复用已有**：`etf_daily`、`etf_pool_snapshots`、`indices`、`index_daily_prices`（及可选的估值/行业权重表，不进入 P0 账本路径）
- **已建 DDL + 同步 job**：`fx_rates`（`rate_date` / `from_currency` / `to_currency` / `rate` / `source`）
- **明确不建**：`price_bars`、`benchmarks`、`benchmark_prices`

建表原则（**SQL 落地在 `scheduled-tasks`，本仓只约定契约**）：

- 用户账本表必须包含 `user_id uuid not null`，并启用 RLS。
- RLS 策略必须绑定 `user_id = (select auth.uid())`。
- `UPDATE` 策略必须同时写 `USING` 和 `WITH CHECK`。
- 所有外键列和 `user_id` 都必须建索引。
- 不使用 `SECURITY DEFINER` 规避权限问题。
- 共享行情表（含已有 `etf_daily` 等与 `fx_rates`）为**全局共享**：不设 `user_id`，RLS 仅允许 `authenticated` 只读；写入仅由 `scheduled-tasks` job / 管理员脚本完成，本仓客户端不开放任意写入。这是有意为之，避免每个用户重复存储相同行情。
- 应用层禁止再创建与 `etf_daily` / `indices` / `index_daily_prices` 同义的第二套行情表。
- 本仓库**禁止**提交权威 DDL；表结构变更 PR 开在 `scheduled-tasks`，本仓同步更新类型与 Repository 映射即可。

RLS 策略模式示例：

```sql
alter table public.positions enable row level security;

create policy "positions_select_own"
on public.positions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "positions_insert_own"
on public.positions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "positions_update_own"
on public.positions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "positions_delete_own"
on public.positions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index positions_user_id_idx on public.positions (user_id);
create index positions_instrument_id_idx on public.positions (instrument_id);
```

### 4.3 补充数据实体与产品含义

下面几类数据不是 P0 第一条 PR 必须全部实现，但必须在模型层预留，否则风险仪表盘、回测、基准归因会缺少输入。

| 实体                                    | 解决的问题                           | 最小字段                                                                        | 首次落地阶段                                        |
| --------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------- |
| `portfolio_settings`                    | 基础币种、组合基准、再平衡阈值       | `base_currency`、`benchmark_id`、偏离阈值                                       | Phase 0 / Phase 2                                   |
| `target_allocations`                    | 独立于持仓快照的目标配置             | `instrument_id`、`target_weight`、`allocation_role`                             | Phase 0 / Phase 2                                   |
| `cash_accounts`                         | 分币种现金余额、现金不足、换汇需求   | `currency`、`balance`、`fx_rate_to_base`、`as_of_date`                          | Phase 0 / Phase 2                                   |
| `rebalance_plans`                       | 资产配置再平衡计划，独立于网格计划   | `target_weights`、`planned_trades`、`trigger_reason`、`status`                  | Phase 2                                             |
| `PriceBar` → `etf_daily`                | 回测、波动率、最大回撤、买入持有对照 | `etf_code`、`trade_date`、OHLC（含 qfq）、`volume`                              | 已有数据；Phase 2 填现价 / Phase 5 回测             |
| `fx_rates`（DDL 已建）                  | 港美 ETF 折算、汇兑损益、币种暴露    | `rate_date`、`from_currency`、`to_currency`、`rate`                             | 对库执行 migration 后由 job 同步；本仓 Phase 2 只读 |
| `Benchmark` → `indices`                 | 组合基准、单标的跟踪指数、Beta 归因  | `code`、`name`、`category`                                                      | 已有；Phase 4 归因前补链路                          |
| `BenchmarkPrice` → `index_daily_prices` | 基准收益曲线、组合对照               | `index_code`、`trade_date`、`close`                                             | 已有；Phase 4 前对齐至与 ETF 同日                   |
| `portfolio_snapshots`                   | TWR 分段、净值曲线、回撤             | `as_of_date`、`total_market_value_base`、`cash_value_base`、`total_assets_base` | Phase 2 / Phase 4                                   |

现金账户规则：

- `cash_flows` 记录资金流事件；`trade_records` 的买卖结算同步影响分币种现金；`cash_accounts` 记录某个日期的现金余额快照，用于校验而非唯一事实源。
- `deposit`、`withdrawal` 为外部现金流，仅这两类参与 XIRR。
- `dividend`、`fee`、`tax`、`interest` 为内部现金流，影响现金余额与 TWR，需尽量关联 `instrumentId`（分红归因）。
- `fx_exchange` 必须记录双腿：`currency`/`amount`（入账）与 `counterCurrency`/`counterAmount`（出账），不能只记单边。
- A 股、港股、美股同时存在时，现金余额必须按 CNY/HKD/USD 分开记录。
- 再平衡和网格执行必须先检查对应币种现金，不允许只看折算后的总现金。

基准规则：

- 每个 `ETFInstrument` 应允许绑定 `trackingIndex` 或 `benchmarkId`（二选一或同时存在，展示时优先 `benchmarkId`）。
- 组合层通过 `portfolio_settings.benchmarkId` 配置组合基准，用于判断整体是否跑赢目标市场暴露。
- 网格计划必须保留“买入持有”对照口径，不能只展示网格绝对收益。
- 资产配置归因中 Beta 来自目标配置和基准收益，配置执行偏差来自偏离目标、未再平衡、现金闲置和交易成本。
- 网格归因单独计算：网格 Alpha 来自网格策略相对同标的买入持有的超额，不能混入资产配置 Beta。

数据质量规则：

- ETF 代码必须标准化，例如 `510300.SH`、`2800.HK`、`VOO.US`，导入时保留原始代码和标准化代码；与库内短码（`510300`）互转由 `market-data.ts` 完成。
- 成交导入必须区分 `tradeDate` 与可选 `settlementDate`；份额与成本默认按 `tradeDate`，现金结算默认按 `settlementDate`（缺省则等于 `tradeDate`）。
- 去重优先级：`brokerRef` 唯一 > `importHash`。`importHash` 在 `brokerRef` 缺失时覆盖：日期、代码、方向、价格、数量、费用、币种、**`importRowIndex`**，避免同日同价多笔真实成交（尤其网格）被误杀。
- 分红、拆分、合并、份额调整不能塞进普通买卖成交，应作为现金流或公司行动单独建模；P0 可先记录为待处理异常。
- 缺价格、缺汇率、缺币种、重复成交、现金不足都必须返回结构化错误，UI 只负责展示错误。

### 4.4 行情与汇率数据来源

项目不接券商、不做自动交易。共享日 K / 指数 / 汇率**一律由 `scheduled-tasks` 接入数据源并落表**；本仓只读 Supabase。用户账本（成交、持仓、现金流）仍可由本仓 CSV/手工写入（经 RLS）。

| 数据       | 权威来源（`scheduled-tasks`）                                                         | 本仓用法                                            | 落点                         |
| ---------- | ------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------- |
| 持仓现价   | 最新 `etf_daily`（优先 qfq）；可被用户手工/持仓 CSV 覆盖展示值                        | 读表或用户覆盖                                      | `positions.currentPrice`     |
| 日 K       | 已有 job：`sync_etf_kline_*` → yfinance → `etf_daily`                                 | 只读映射为 `PriceBar`；禁止本仓主路径写 `etf_daily` | `etf_daily`                  |
| 汇率       | **Frankfurter（ECB）** → `sync_fx_rates_frankfurter` → `fx_rates`（USD/CNY/HKD 三角） | 只读；CSV 仅应急补洞                                | `fx_rates`（列 `rate_date`） |
| 基准价格   | 已有 `index_daily_prices`（当前 scheduled-tasks 暂不维护指数同步；缺则在该仓补 job）  | 只读                                                | `index_daily_prices`         |
| 标的主数据 | `etf_pool_snapshots`（池维护不在本仓）                                                | 只读                                                | → `ETFInstrument`            |

#### 汇率数据源选型（`scheduled-tasks` 已落地）

| 方案                                   | 结论       | 理由                                                        | 代价                                                         |
| -------------------------------------- | ---------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| **Frankfurter（ECB）**                 | **已采用** | 央行日频参考价、无 API Key、可自托管；满足 CNY/HKD/USD 折算 | 工作日约 16:00 CET 更新；周末/节假日无新价，估值用最近交易日 |
| 中国外汇交易中心中间价                 | 可选增强   | 对 CNY 官方口径更贴切                                       | API/解析成本高于 Frankfurter；可作交叉校验                   |
| Open Exchange Rates / ExchangeRate-API | 备选       | 商业 SLA、币种更全                                          | 需 Key 与额度                                                |
| 抓取 Yahoo/Google 汇率页               | 不采用     | 无 SLA、易变、难复现                                        | —                                                            |

同步约定（`scheduled-tasks` 已实现）：

- 日频拉取 Frankfurter，写入 `fx_rates(rate_date, from_currency, to_currency, rate)`，按三元组 upsert。
- 保证 `USD→CNY`、`USD→HKD`、`HKD→CNY`（由 USD 锚点推导）；`rate` 语义为「1 from = rate to」。
- `sync_runs.job_name=sync_fx_rates_frankfurter`；失败走 Bark。
- 本仓缺汇率时返回结构化错误/警告，不静默用 1.0。

`src/lib/investment/market-data.ts` 负责（本仓）：

- 物理行 ↔ 领域类型映射（含短码/`510300.SH` 标准化）。
- 回测取价口径：优先前复权字段，并在注释/测试中固定口径。
- 汇率行映射与缺价处理；可选 CSV **补洞解析**（字段校验、按 `(from, to, date)` 去重），但**不得**作为共享表主写入路径。
- 不内嵌第三方行情/汇率 API Key；不在客户端批量写入共享行情表。

## 5. 分阶段实施路线

### 5.1 Phase 0：文档与数据地基

目标：先把账本、收益率和导入能力做成纯函数，避免 UI 和远端数据同时引入复杂度。

任务：

1. ~~将 `~/Downloads/PLAN.md` 迁入 `docs/investment-product-plan.md`~~（已完成）

2. ~~修订产品需求文档（改 `docs/investment-product-plan.md`）~~（已完成）

3. 新增 `src/types/investment.ts`

   - 定义组合设置、目标配置、ETF、持仓、成交、现金流、再平衡计划、网格计划、复盘、决策日志类型。
   - `GridPlanSnapshot` 复用 `src/types/grid-v2.ts` 的 `GridStrategyParamsV2`、`GridLeg`、`AggregatedGridRow`。
   - 用 `TargetAllocation.allocationRole` 表达资产配置角色，用 `executionIntent` 表达成交归因，禁止用 `grid` 作为资产配置角色。
   - 禁止使用 `any`。

4. 新增纯函数模块

- `money.ts`：金额、份额、汇率、百分比格式化和四舍五入。
- `portfolio.ts`：总资产、分币种现金比例、币种暴露、分类权重、单标的集中度。
- `cash.ts`：由 `cash_flows` + `trade_records` 推导分币种现金余额，支持与 `cash_accounts` 快照对账。
- `returns.ts`：XIRR（仅外部现金流）、TWR。
- `rebalancing.ts`：基于 `target_allocations` 计算偏离、再平衡计划和建议动作。
- `csv-import.ts`：CSV 成交/现金流导入、字段映射、去重（`brokerRef` / `importHash`）。

验收标准：

- `npm test -- --runInBand` 通过。
- XIRR 至少覆盖：无外部现金流、单次出入金、多次出入金；并验证 `dividend` 不计入 XIRR 外部口径。
- TWR 至少覆盖：无现金流、负收益、含内部分红。
- 现金余额至少覆盖：仅外部出入金、含买卖结算、含分红与费用、多币种分账。
- 再平衡至少覆盖：低配、高配、现金不足、新增资金优先补低配；目标权重来自 `target_allocations` 而非 `positions`。
- 同一 ETF 同时存在目标权重和网格计划时，目标配置偏离不受网格计划影响。
- CSV 至少覆盖：空文件、缺列、重复成交（含同日同价不同行）、币种缺失。
- 事实源规则至少覆盖：持仓快照不能静默覆盖成交和现金流推导出的历史事实；导入持仓不得覆盖 `target_allocations`。

### 5.2 Phase 1：Supabase 持久化与认证

目标：把 P0 账本经 Supabase 读写打通，并保证用户数据隔离。**建表与共享数据同步不在本仓完成。**

执行前置：

- 修改 `package.json` 前先征询用户确认。
- 实现前查 Supabase 当前文档和 changelog，确认 `@supabase/supabase-js` 安装方式、RLS 建议和 key 命名。
- **依赖 `scheduled-tasks`**：用户账本 12 表 + `fx_rates` 的 DDL/RLS、以及（如需）`sync_fx_rates_*` job 必须先在该仓合并并应用到目标库；本仓只消费已存在的表。

任务：

1. 安装 Supabase SDK

   - 预计命令：`npm install @supabase/supabase-js`
   - 必须提交 lockfile。

2. 新增环境示例

   - `.env.local.example`
   - 只写变量名，不写真实值。

3. 新增客户端

   - `src/lib/supabase/client.ts`
   - 只读取 `NEXT_PUBLIC_SUPABASE_URL` 和公开 key。
   - 缺失配置时返回明确错误，不静默失败。

4. 新增 repository

   - `src/lib/supabase/investment-repository.ts`
   - 封装组合设置、目标配置、ETF、持仓、成交、现金流、再平衡计划、网格计划、复盘、决策日志 CRUD。
   - 行情/汇率：**只读** `etf_daily` / `etf_pool_snapshots` / `indices` / `index_daily_prices` / `fx_rates`。
   - 所有账本写入都要求当前用户存在；禁止对共享行情表做 upsert/delete。

5. 表契约对齐（**不在本仓写 migration**）

   - 在本仓文档或类型注释中固定与 `scheduled-tasks` 一致的表/列契约（可链到该仓 `schema.sql` / migration）。
   - **禁止**新增 `docs/supabase-schema.sql` 或 `supabase/migrations/*` 作为权威 DDL。
   - 若表尚未在目标库出现：阻塞本 Phase 的集成验收，改为先提 `scheduled-tasks` PR（账本表 + `fx_rates` + RLS；汇率 job 可并行）。
   - Repository 行情读路径映射到现有共享表；`fx_rates` 就绪后接入只读查询。

6. 认证与会话
   - 新增 `src/lib/supabase/auth.ts`：封装**邮箱 Magic Link**登录、登出、获取当前用户（已确认：Phase 1 不做 OAuth）。
   - 新增 `src/components/auth/auth-gate.tsx`：未登录时展示邮箱 Magic Link 入口。
   - 驾驶舱相关路由在 Phase 2 接入 `AuthGate`；Repository 在无会话时拒绝写入并返回明确错误。

验收标准：

- 目标库中用户账本表已启用 RLS 且有 `user_id` 隔离（由 `scheduled-tasks` 落地，本仓用集成/手工查询确认）。
- 共享行情表（含 `fx_rates` 若已建）为 authenticated 只读；本仓代码路径无共享表写入。
- 未新建与现表同义的 `price_bars` / `benchmarks` / `benchmark_prices`。
- 本仓无权威 DDL 文件；外键和 `user_id` 索引在库侧存在（核对即可）。
- 未登录用户无法写入账本数据。
- 不出现 `service_role`、真实 key、硬编码凭证。
- Repository 单测 mock Supabase 客户端，覆盖成功和失败路径。

### 5.3 Phase 2：组合驾驶舱

目标：把持仓、目标配置、现金、币种暴露和再平衡建议展示成可操作页面。

任务：

1. 新增路由

   - `src/app/view/cockpit/page.tsx`

2. 新增组件

   - `portfolio-summary.tsx`：总资产、现金比例、收益指标（XIRR/TWR）。
   - `portfolio-settings-form.tsx`：基础币种、组合基准、再平衡阈值。
   - `target-allocation-form.tsx`：维护 `target_allocations`，与持仓导入分离。
   - `allocation-drift-table.tsx`：当前比例、目标比例、相对偏离、绝对偏离。
   - `rebalance-actions.tsx`：再平衡计划、建议补仓/减仓金额、触发原因。
   - `currency-exposure.tsx`：CNY/HKD/USD 暴露。
   - `csv-import-panel.tsx`：导入成交、持仓快照；汇率以读 `fx_rates` 为主，CSV 仅应急补洞。
   - `cash-flow-form.tsx`：手工录入外部出入金、分红、费用、换汇（含双腿）。
   - `market-data-import-panel.tsx`：可选——汇率 CSV 补洞；价格以读 `etf_daily` 为主（禁止作为共享表主写入路径）。

3. 首页入口

   - 在 `src/components/home/home-tool-grid.tsx` 中增加 ETF 驾驶舱入口。
   - 可以替换当前“持仓分析”占位卡。

4. 与旭日图关系
   - 不直接改造旭日图为数据源。
   - 驾驶舱应从结构化 `positions` 派生分类数据。
   - 后续可复用旭日图组件展示分类占比。

验收标准：

- 空数据时显示明确空状态。
- 缺价格、缺汇率、缺目标配置时显示错误或警告。
- 用户可录入外部出入金与分红，收益指标（XIRR/TWR）可计算。
- 目标权重在 `target_allocations` 维护，导入持仓不会覆盖目标配置。
- 仅 A 股、A+港股、A+美股三类样例都能正确计算。
- 生成的是 `rebalance_plans`，不是 `grid_plans`；资产配置页面不直接生成网格计划。
- 页面不直接写复杂计算，复杂逻辑必须在 `src/lib/investment/*`。

### 5.4 Phase 3：网格实盘闭环

目标：让网格模块作为独立辅策略，从“生成策略”升级为“计划 + 执行 + 对照”。网格计划可以引用持仓和现金数据，但不改变资产配置目标权重。

任务：

1. 保存网格计划

   - 在网格页生成策略后，允许保存为 `grid_plans`。
   - 保存内容包括 `params`、`legs`、`aggregatedRows`、预算、状态。
   - 不修改 `src/lib/grid/*` 的计算语义。
   - 不从持仓偏离自动生成网格计划；网格计划由用户在网格策略上下文中创建。

2. 匹配成交记录

   - 新增 `src/lib/investment/grid-execution.ts`。
   - 输入 `GridPlanSnapshot` + `TradeRecord[]`。
   - 输出已触发档位、已成交档位、漏执行档位、剩余弹药、已实现收益。

3. 网格 vs 持有对照
   - 基于同一标的、同一周期、同一投入金额对比。
   - 保持保守口径，明确费用和滑点是否计入。

验收标准：

- 一笔买入能匹配到正确档位。
- 多笔成交能聚合到同一网格计划。
- 重复成交不会重复扣减弹药。
- 买入和卖出都能正确影响已实现收益。

### 5.5 Phase 4：复盘系统与决策日志

目标：将资产配置归因、网格策略归因、执行偏差和预注册假设汇总为可复盘报告。复盘报告必须分栏呈现主线和辅线，避免把网格收益误记为资产配置有效。

任务：

1. 新增路由

   - `src/app/view/review/page.tsx`

2. 新增决策日志

   - `decision-log-form.tsx`
   - 字段必须包含：假设、验证条件、失效条件、复查日期。
   - 买入、卖出、调参建议关联决策日志。

3. 新增复盘计算

   - `attribution.ts`：资产配置 Beta、配置执行偏差、网格 Alpha、网格执行偏差。
   - `review-report.ts`：生成周报/月报结构。

4. 导出
   - 支持 Markdown 导出。
   - 导出内容必须包含数据周期、收益归因、纪律问题、下次动作。

验收标准：

- 能基于导入成交和现金流生成周期收益。
- 能列出本周期资产配置收益、偏离成本和再平衡执行情况。
- 能单独列出本周期网格贡献、网格 vs 持有对照和网格执行偏差。
- 能列出目标配置偏离和未执行动作。
- 每条复盘结论能追溯到数据源或决策日志。

### 5.6 Phase 5：网格历史回测

目标：用历史日 K 验证网格参数和弹药配置。

任务：

1. 新增 `src/lib/investment/backtest-grid.ts`
2. 输入：
   - 日 K：`date/open/high/low/close`（来自 `etf_daily` 映射的 `PriceBar`；回测优先前复权字段）
   - 网格计划参数
   - 初始现金
   - 交易成本参数
3. 保守成交假设（日 K 无法确定日内顺序，采用悲观口径）：
   - 当日 `low <= buyPrice` 触发买入。
   - 当日 `high >= sellPrice` 触发卖出。
   - 同日买卖档位同时触发时，**默认先卖后买**（避免同日低买高卖的乐观假设）；若改规则必须写入测试并注明口径。
4. 输出：
   - 资金曲线
   - 最大回撤
   - 成交次数
   - 现金占用
   - 网格收益
   - 买入持有对照收益

验收标准：

- 单调下跌样例不应产生虚假卖出收益。
- 震荡样例应产生网格成交收益。
- 现金不足时不允许继续买入。
- 费用升高时净收益下降。

## 6. 第一条 PR 建议

第一条 PR 只做 P0，不接 Supabase、不做 UI。

范围：

- ~~修订产品需求文档（改 `docs/investment-product-plan.md`）~~（已完成）。
- 新增 `src/types/investment.ts`。
- 新增：
  - `src/lib/investment/money.ts`
  - `src/lib/investment/portfolio.ts`
  - `src/lib/investment/cash.ts`
  - `src/lib/investment/returns.ts`
  - `src/lib/investment/rebalancing.ts`
  - `src/lib/investment/csv-import.ts`
- 新增对应单测。

不做：

- 不修改 `package.json`。
- 不接 Supabase。
- 不改网格计算器。
- 不改全局样式。

第一条 PR 的验证命令：

```bash
npm test -- --runInBand
npm run lint
npm run build
```

## 7. 给执行 AI 的操作提示

```text
你在 /Users/abnersun/Downloads/code/stock-charts 工作。

先读：
1. docs/etf-investment-cockpit-implementation-plan.md
2. docs/investment-product-plan.md（产品需求源）
3. src/app/view/grid/page.tsx
4. src/app/view/sunburst/page.tsx
5. src/types/grid.ts
6. src/types/grid-v2.ts

执行纪律：
- 任何非琐碎改动前先说明计划。
- package.json/package-lock.json 改动前必须先征询用户。
- 不修改 docs/grid-strategy-design.md。
- 不在代码或文档里写真实凭证。
- 建表 / migration / 第三方数据源 / 共享表落库只在 `scheduled-tasks`；本仓只做业务与 Supabase 调用。
- 先写纯函数和测试，再接 UI，再接 Supabase。
- 复杂计算必须放在 src/lib/investment，不要塞进 React 组件。
- TypeScript 严格模式下禁止滥用 any。
- 单参数箭头函数写成 param => expr。
- 代码注释使用中文，只解释 Why。

每阶段完成后运行：
npm test -- --runInBand
npm run lint
npm run build

代码改完后执行 code-reviewer agent 做 CR。
```

## 8. Code Review 检查清单

| 检查项   | 通过标准                                                                          |
| -------- | --------------------------------------------------------------------------------- |
| 范围控制 | 没有改 `docs/grid-strategy-design.md`，没有混入网格计算器升级                     |
| 类型安全 | 无新增 `any`，领域类型集中在 `src/types/investment.ts`                            |
| 计算纯度 | 收益率、再平衡、网格执行匹配均为纯函数并有单测                                    |
| 数据安全 | 无真实 key，无 service role；账本经 RLS；共享表本仓只读                           |
| 仓职责   | 无本仓 DDL/migration；无第三方行情/汇率直连；共享落库不在本仓                     |
| 多币种   | 港股、美股 ETF 都有 `currency` 与 `fxRateToBase`                                  |
| 事实源   | `target_allocations`、`trade_records`、`cash_flows` 与 `positions` 的职责边界清晰 |
| 目标配置 | 目标权重存于 `target_allocations`，持仓导入不覆盖                                 |
| 现金推导 | 分币种现金由 `cash_flows` + `trade_records` 推导，非仅现金流表                    |
| 策略边界 | `rebalance_plans` 与 `grid_plans` 独立，网格策略不参与目标配置比例计算            |
| 现金流   | XIRR 仅用外部出入金；分红/费用为内部事件                                          |
| 配置归因 | 组合和标的能绑定基准，复盘能解释资产配置 Beta 与再平衡执行偏差                    |
| 网格归因 | 网格收益单独对比同标的买入持有，不能混入配置收益                                  |
| 复盘闭环 | 复盘结论能追溯到现金流、成交、再平衡计划、网格计划或决策日志                      |
| 异常处理 | 空数据、缺价格、缺汇率、重复成交、现金不足都有明确错误                            |

## 9. Definition of Done

### P0 DOD

- 能用纯函数从持仓、`target_allocations`、现金流、成交记录计算组合总资产、现金比例、XIRR/TWR。
- XIRR 仅使用 `deposit`/`withdrawal`；`dividend` 等内部事件不影响 XIRR 外部口径。
- 能用 `cash.ts` 从现金流与成交推导分币种现金余额。
- 能计算目标配置偏离（基于 `target_allocations`），并按相对 `±20%`、绝对 `±5%` 给出触发原因。
- 能导入一份成交 CSV，并识别缺列、重复成交、币种缺失；同日同价多笔靠 `importRowIndex` 或 `brokerRef` 区分。
- 能区分账本事实和持仓快照，快照差异不会静默覆盖历史成交和现金流；导入持仓不覆盖目标配置。
- 能用同一 ETF 同时存在目标权重和网格计划的样例证明：网格计划不影响资产配置偏离。

### P1 DOD

- 目标库用户账本表结构、RLS、索引完整（由 `scheduled-tasks` 维护）；共享行情复用已有表 + `fx_rates`（若已同步），均为 authenticated 只读；不建同义 `price_bars`/`benchmarks`/`benchmark_prices`。
- 本仓无权威 DDL/migration；无第三方行情/汇率直连拉数与共享表批量落库。
- 用户只能读写自己的账本数据。
- 登录/登出可用（邮箱 Magic Link），未登录无法写入。
- `.env.local.example` 不含真实凭证。
- Repository 失败路径有明确错误；缺 `fx_rates` 时有明确提示。

### P2 DOD

- 驾驶舱能展示总资产、现金比例、分类权重、目标偏离、币种暴露。
- 用户可维护 `target_allocations` 与外部出入金/分红录入。
- 驾驶舱能生成再平衡计划，并明确它不是网格计划。
- 三类组合样例均通过：仅 A 股、A+港股、A+美股。
- 页面计算结果与手工表格一致。

### P3 DOD

- 网格计划能保存为快照。
- 成交记录能匹配到网格档位。
- 能输出剩余弹药、已实现收益、网格 vs 持有对照。

### P4 DOD

- 能生成周/月复盘报告。
- 报告分开展示资产配置归因和网格策略归因。
- 资产配置归因包含 Beta、目标偏离、再平衡执行偏差。
- 网格策略归因包含网格 Alpha、网格 vs 持有对照、网格执行偏差。
- 决策日志包含假设、验证条件、失效条件、复查日期。

### P5 DOD

- 回测引擎支持日 K 保守触发假设（同日先卖后买）。
- 单调下跌、震荡、现金不足、费用升高四类样例有单测。
- 回测结果能解释资金曲线、最大回撤、成交次数和收益来源。

## 10. 产品边界与异常状态

### 10.1 产品定位边界

ETF 投资驾驶舱只做记录、计算、提醒和复盘，不替代用户做投资决策。

UI 和文案必须遵守：

- 使用“触发检查”“低于目标配置”“需要人工确认”“偏离纪律阈值”等表述。
- 避免使用“推荐买入”“应该卖出”“保证收益”“确定跑赢”等投资建议式表述。
- 所有再平衡、网格和复盘输出都必须展示依据：触发规则、输入数据、计算口径或关联决策日志。

### 10.2 异常状态清单

产品落地时不要只实现 happy path。以下状态必须有明确错误、警告或空状态：

| 异常状态          | 触发场景                                                             | 产品处理                               |
| ----------------- | -------------------------------------------------------------------- | -------------------------------------- |
| 无数据            | 用户首次进入驾驶舱                                                   | 展示导入入口和最小样例，不显示虚假指标 |
| 数据过期          | 持仓、价格或汇率超过用户设定时效                                     | 标记数据日期，暂停依赖该数据的建议     |
| 缺价格            | `positions.currentPrice` 或 `etf_daily.close`（领域 `PriceBar`）缺失 | 不计算市值和收益，提示补价格           |
| 缺汇率            | 非基础币种缺少 `fx_rates` / `fxRateToBase`（同步未覆盖或补洞未录）   | 不折算总资产，提示等待同步或应急补洞   |
| 现金不足          | 网格执行或再平衡需要的币种现金不足                                   | 标记为“资金不足”，不生成可执行动作     |
| 重复成交          | `brokerRef` 或 `importHash` 已存在                                   | 跳过重复记录并展示导入摘要             |
| 目标配置缺失      | 有持仓但未设置 `target_allocations`                                  | 偏离表显示“未设目标”，不生成再平衡计划 |
| 快照差异          | 持仓快照与账本推导不一致                                             | 展示差异金额和份额，要求人工确认       |
| 网格跌破下限      | 当前价格低于网格计划下限                                             | 标记为暂停或需复评，不继续自动加码     |
| Supabase 连接失败 | 环境变量缺失、Auth 失效、网络失败                                    | 展示可恢复错误，不丢弃本地导入内容     |

### 10.3 数据生命周期

- 必须保留 CSV/JSON 导入导出，保证用户可以迁移和备份数据。
- 删除用户数据时，应覆盖组合设置、目标配置、ETF 标的自定义数据、持仓、成交、现金流、现金账户、组合估值快照、再平衡计划、网格计划、复盘和决策日志。
- 云端数据和本地导入冲突时，以 `brokerRef` 或 `importHash` 和更新时间生成冲突清单，交给用户确认。
- 项目不保存券商账号、密码、交易 Token 或任何可用于自动交易的凭证。
