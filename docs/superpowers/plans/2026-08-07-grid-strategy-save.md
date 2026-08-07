# 网格策略云端保存功能实施计划

> **执行要求：** 使用 `superpowers:executing-plans` 按任务逐项实现并在每个验证点停下来检查结果。

**目标：** 为 `/view/grid` 增加账号云端保存能力，使用户可以保存命名策略、结果快照，并在后续打开、修改、覆盖、改名和删除。

**架构：** 网格计算保持公开；保存和“我的策略”使用现有 GitHub OAuth，但不复用家庭财务白名单。Supabase 使用单表保存可查询元数据，以及版本化的配置和结果 JSONB；页面将草稿参数、最后成功生成结果、已保存基线明确分离。

**技术栈：** Next.js 14、React 18、TypeScript、Ant Design 5、Supabase Auth/Postgres/RLS、Jest、Playwright。

## 全局约束

- 不新增依赖，不修改 `package.json`、`package-lock.json` 或 `pnpm-lock.yaml`。
- 不修改网格计算纯函数、计算规则和结果表展示契约。
- 按双仓约定，实施时先在本仓 `docs/superpowers/specs/2026-08-07-grid-strategy-save-design.md` 固化表契约，再落地 DDL 和 Repository。
- 权威 DDL 落在兄弟仓 `scheduled-tasks`；`stock-charts` 不新增 migration 目录。
- 所有云端记录必须以 RLS 隔离到当前用户，浏览器不得使用 service role key。
- 名称由用户填写，trim 后长度为 1～50；同一用户下忽略大小写唯一。
- 保存完整计算参数和当次结果快照；打开旧策略时不得自动用新算法重算。
- 保存、更新、改名、删除失败时保留当前页面、表单和结果状态。

### 现有 `grid_plans` 不复用的原因

`scheduled-tasks` 已存在 `public.grid_plans`，但它属于驾驶舱交易执行账本：强制要求
`instrument_id`、带 `draft/active/paused/closed` 生命周期，并被 `trade_records` 和
`decision_logs` 外键引用。当前 `/view/grid` 没有标的字段，保存的是计算器配置和历史结果
快照，不是已进入执行生命周期的交易计划。因此本功能使用独立的
`public.grid_strategies`，避免写入虚假标的、污染执行账本语义，后续若要把已保存策略转成
实盘计划，再通过显式“创建交易计划”流程写入 `grid_plans`。

---

## 1. 数据模型与 Supabase 安全

### 1.1 Migration

先在 `stock-charts` 的
`docs/superpowers/specs/2026-08-07-grid-strategy-save-design.md` 写清表用途、字段、约束、版本演进、RLS 和双仓实施顺序；该 spec 是本功能的跨仓数据契约。然后在 `scheduled-tasks` 新增权威 migration：

`src/scheduled_tasks/models/migrations/20260807_grid_strategies.sql`

创建 `public.grid_strategies`：

| 字段 | 类型与约束 |
| --- | --- |
| `id` | `uuid primary key default gen_random_uuid()` |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` |
| `name` | `text not null`，检查 `char_length(btrim(name)) between 1 and 50` |
| `schema_version` | `integer not null default 1 check (schema_version = 1)` |
| `config` | `jsonb not null`，检查根节点为 object |
| `result_snapshot` | `jsonb not null`，检查根节点为 object |
| `created_at` | `timestamptz not null default now()` |
| `updated_at` | `timestamptz not null default now()` |

`schema_version = 1` 的 CHECK 表示本期数据库只允许 v1，与应用层对未知版本的防御性拒绝不冲突。引入 v2 时，必须先让读取端具备 v2 解析能力，再通过 migration 将 `grid_strategies_schema_version_check` 放宽或替换为允许 v1/v2，最后启用 v2 写入；不得只修改应用常量而保留当前硬约束。

索引：

- 唯一索引：`(user_id, lower(btrim(name)))`。
- 列表索引：`(user_id, updated_at desc)`。

权限与 RLS：

- 先显式撤销 `public`、`anon` 和 `authenticated` 的表权限，再只授予 `authenticated` 所需的 CRUD 权限，避免受目标库默认权限或旧表残留 grant 影响。
- 显式授予 `authenticated` 对表的 `select, insert, update, delete` 权限。
- 启用 RLS。
- `select`、`delete` 使用 `to authenticated using ((select auth.uid()) = user_id)`。
- `insert` 使用 `to authenticated with check ((select auth.uid()) = user_id)`。
- `update` 同时使用上述 ownership 条件作为 `using` 和 `with check`。
- 不创建 `security definer` 函数，不依赖用户可修改的 `user_metadata`。

参考：[Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)、[Supabase Auth](https://supabase.com/docs/guides/auth)。

### 1.2 数据库验证

- [ ] 应用 migration 前确认目标项目和当前 migration 顺序。
- [ ] 应用 migration 后检查列、约束、索引、grant 和四类 policy。
- [ ] 以匿名身份验证查询返回 0 且写入被拒绝。
- [ ] 以两个不同用户身份验证只能读取、更新和删除自己的记录。
- [ ] 验证同一用户的 `StrategyA` 与 ` strategya ` 发生唯一冲突，不同用户可使用相同名称。
- [ ] 运行 Supabase advisors，处理本次 migration 引入的安全或性能告警。

---

## 2. 类型、快照校验与 Repository

### 2.1 版本化类型

新增 `src/types/grid-strategy-storage.ts`：

```ts
export interface GridStrategyConfigV1 {
  params: GridParams;
  dynamicGridEnabled: boolean;
  dynamicGridMode: 'stable' | 'aggressive';
}

export type GridStrategySnapshotV1 = GridRunResult;

export interface GridStrategyMetadata {
  id: string;
  name: string;
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
}

export interface SavedGridStrategyV1 extends GridStrategyMetadata {
  config: GridStrategyConfigV1;
  resultSnapshot: GridStrategySnapshotV1;
}
```

新增纯函数：

- `parseSavedGridStrategy(row: unknown): SavedGridStrategyV1`：校验版本、配置字段、有限数值、枚举、数组、`stressTest` 和空 `calculationErrors`。
- `isSameGridStrategyConfig(left, right): boolean`：逐字段比较固定结构，不使用宽松对象比较。
- 未知 `schema_version` 抛出“该策略版本暂不支持”；损坏结构抛出“策略数据已损坏，无法打开”。

### 2.2 Repository

新增 `src/lib/supabase/grid-strategy-repository.ts`，公开：

```ts
class GridStrategyRepository {
  list(): Promise<GridStrategyMetadata[]>;
  get(id: string): Promise<SavedGridStrategyV1>;
  create(name: string, payload: GridStrategySavePayload): Promise<SavedGridStrategyV1>;
  update(id: string, payload: GridStrategySavePayload): Promise<SavedGridStrategyV1>;
  rename(id: string, name: string): Promise<GridStrategyMetadata>;
  delete(id: string): Promise<void>;
}
```

实现规则：

- 每次操作前调用 `client.auth.getUser()`，无用户时抛出“登录状态已失效，请重新登录”。
- `list()` 仅查询 `id,name,schema_version,created_at,updated_at`，按 `updated_at desc` 排序。
- `get()` 才读取 `config,result_snapshot` 并调用解析器。
- `create()` 写入当前 `user_id`、trim 后名称和 `schema_version=1`。
- `update()` 不允许改变名称和 `user_id`，显式更新 `updated_at`。
- `rename()` 只修改 trim 后名称和 `updated_at`。
- PostgreSQL `23505` 映射为“已有同名策略，请更换名称”。
- 读取或更新不到记录统一映射为“策略不存在或无权访问”。

### 2.3 单元测试

新增：

- `__tests__/grid/grid-strategy-storage.test.ts`
- `__tests__/grid/grid-strategy-repository.test.ts`

覆盖：

- [ ] v1 合法配置和结果快照可恢复。
- [ ] 未知版本、缺字段、非法枚举、非有限数值、失败结果快照被拒绝。
- [ ] 配置比较能区分全部参数及动态网格选项。
- [ ] 列表查询不请求 JSONB 大字段且排序正确。
- [ ] 创建、覆盖、改名、删除写入正确字段。
- [ ] 重名、会话失效、记录不存在返回明确中文错误。

---

## 3. 参数与结果状态收敛

修改 `src/hooks/use-grid-params.ts`：

- 新增 `replaceParams(next: GridParams): void`，整体替换加载策略的参数。
- 替换后仍通过既有 `validateGridParams` 产生错误和价格精度。

修改 `src/app/view/grid/page.tsx`：

- 将 `gridData`、`stressTest`、`aggregatedRows`、`legs`、`amountPerGrid`、`warnings`、`calculationErrors`、`strategyState` 收敛为单个 `GridRunResult | null`。
- 新增 `generatedConfig: GridStrategyConfigV1 | null`，只在生成成功或加载策略时更新。
- 当前表单参数和动态选项是草稿；`draftDirty` 通过草稿配置与 `generatedConfig` 比较得出。
- 摘要条和结果区始终读取 `generatedConfig` 与 `GridRunResult`，避免关闭抽屉后出现新参数配旧结果。
- 加载云端策略时整体恢复草稿、`generatedConfig` 和结果快照，不调用计算器。
- 首次生成成功后替换 `generatedConfig` 和结果，并设置 `generatedDirty=true` 标记为“待保存”。
- 已加载策略重新生成成功后同样替换 `generatedConfig` 和结果，并设置 `generatedDirty=true` 标记为“待更新”。
- 草稿未重新生成时禁用保存和更新。

状态规则：

| 场景 | 主按钮 |
| --- | --- |
| 新生成、草稿未改 | `保存策略`，可点击 |
| 新生成、草稿已改 | `保存策略`，禁用，提示先重新生成 |
| 已加载、草稿未改、无新结果 | `已保存`，禁用 |
| 已加载、草稿已改、尚未重新生成 | `更新策略`，禁用，提示先重新生成 |
| 已加载、重新生成成功 | `更新策略`，可点击 |
| 删除当前记录 | 保留结果并转为未保存，显示 `保存策略` |

新增单测验证 `replaceParams`、草稿 dirty 判断和上述状态转换。

---

## 4. 登录、保存和“我的策略”界面

### 4.1 登录复用

修改 `src/components/auth/login-modal.tsx`：

- 新增可选 `title`、`description`；不传时继续显示现有家庭财务文案。
- 网格页传入“登录以保存网格策略”和不包含白名单限制的说明。
- 网格页使用 `getBrowserSession()` 判断有效 GitHub session，不调用 `checkFamilyAccess()`。

未登录保存流程：

1. 将 `generatedConfig` 和结果快照写入 `sessionStorage` 键 `grid:pending-save:v1`。
2. 通过现有 OAuth 跳转并回到 `/view/grid`。
3. 页面初始化检测有效 session，解析临时快照并恢复页面。
4. 删除临时键并自动打开名称弹窗。
5. 临时数据损坏时清理键、保留公开计算器并提示恢复失败。

未登录打开“我的策略”流程：

1. 写入带 30 分钟过期时间的 `sessionStorage` 意图键 `grid:pending-library:v1`，并打开登录弹窗。
2. OAuth 回跳并确认 session 有效后，自动加载元数据列表并打开“我的策略” Drawer。
3. Drawer 成功打开后清理意图键；意图过期或损坏时只清理键，不自动打开 Drawer。
4. `grid:pending-save:v1` 与 `grid:pending-library:v1` 互斥：写入新意图前先清理另一意图，以用户最后一次操作为准。

### 4.2 页面入口

- 页头右侧增加「我的策略」和登录后的 `UserMenu`。
- 结果摘要条增加主按钮「保存策略／更新策略」，保留「修改参数」为次按钮。
- 首次保存打开名称 Modal；trim 后为空或超过 50 字时禁用确认。
- 更新成功后刷新当前记录的更新时间并清除待更新状态。
- 所有异步写操作使用独立 loading 锁，避免重复提交。

### 4.3 “我的策略”抽屉

新增 `src/components/grid/grid-strategy-library-drawer.tsx`：

- 打开时加载元数据列表，按更新时间倒序展示名称和更新时间。
- 包含 loading、空态、错误和重试状态。
- 点击记录时再获取完整数据；加载期间禁止重复打开。
- 每条记录支持“改名”和“删除”。改名使用名称 Modal；删除使用二次确认。
- 当前存在未保存的已生成结果或未重新生成草稿时，切换策略前弹出放弃确认。
- 删除当前记录后，通知页面保留结果并清除云端记录 ID。

退出登录：

- 清空策略列表及 Repository 会话状态。
- 页面必须在 Hook 清空 `currentStrategy` 前先快照 `wasCloud = currentStrategy !== null`，再按该快照决定是否重置页面。
- 当前内容来自云端记录时重置为默认未生成页，防止共享设备残留。
- 当前内容是纯本地未保存计算时保持不变。

---

## 5. 验证与发布

### 5.1 Jest

新增单测分布在 Task 2～6；本节命令与后文保持一致，覆盖快照契约、Repository、草稿/保存状态、OAuth 临时意图、持久化 Hook 和既有网格计算回归：

```bash
npm test -- --runInBand \
  __tests__/grid/grid-strategy-storage.test.ts \
  __tests__/grid/grid-strategy-repository.test.ts \
  __tests__/grid/use-grid-params.test.ts \
  __tests__/grid/grid-strategy-workflow.test.ts \
  __tests__/grid/grid-strategy-pending-save.test.ts \
  __tests__/grid/use-grid-strategy-persistence.test.ts \
  __tests__/family-finance/auth.test.ts \
  __tests__/grid-validate-params.test.ts \
  __tests__/grid-run-calculation.test.ts
```

预期：上述定向测试全部通过；最终全量 `npm test` 详见 Task 9。

### 5.2 Playwright

公开/未登录流程与认证 CRUD/RLS 流程分文件验证，详见 Task 8/9：

- `e2e/grid-strategy.spec.ts`：既有公开生成/重新生成回归，以及未登录点击“保存策略/我的策略”时的专用登录弹窗。
- `e2e/grid-strategy-authenticated.spec.ts`：通过 `GRID_E2E_USER_A_STORAGE_STATE` / `GRID_E2E_USER_B_STORAGE_STATE` 创建两个认证上下文，验证保存、打开、覆盖、改名、重名、删除、异常保留和 A/B 隔离。
- 真实 OAuth 整页回跳手工验证两个意图：待保存快照恢复后自动打开名称弹窗；待打开策略库回跳后自动打开 Drawer。

运行：

```bash
npm run test:e2e -- e2e/grid-strategy.spec.ts e2e/grid-strategy-authenticated.spec.ts
```

缺少任一 storage state 时认证 E2E 可以明确 `skip`，但发布验收前必须在非生产环境实际通过一次。

### 5.3 全量验证

```bash
npm test
npm run build
```

完成后执行代码审查，重点检查：

- RLS 是否存在越权路径。
- 参数与结果快照是否始终成对。
- OAuth 回跳数据是否只作临时恢复。
- 异常路径是否保留用户输入和当前结果。
- 是否意外修改公开计算器或家庭财务鉴权。

### 5.4 发布顺序

1. 合并并应用 `scheduled-tasks` migration。
2. 在目标 Supabase 验证 grant、RLS、多用户隔离和 advisors。
3. 发布 `stock-charts`。
4. 使用真实 GitHub 账号完成保存、打开、更新、改名、删除和退出登录冒烟测试。

---

## 6. 文件地图与任务依赖

### 6.1 `scheduled-tasks`

| 文件 | 操作 | 单一职责 |
| --- | --- | --- |
| `src/scheduled_tasks/models/migrations/20260807_grid_strategies.sql` | 新增 | 建表、索引、grant、RLS、注释 |
| `doc/supabase-schema.md` | 修改 | 将 `grid_strategies` 纳入权威数据库说明 |

### 6.2 `stock-charts`

| 文件 | 操作 | 单一职责 |
| --- | --- | --- |
| `docs/superpowers/specs/2026-08-07-grid-strategy-save-design.md` | 新增 | 在 DDL 前固化表契约、RLS、版本演进与双仓边界 |
| `src/types/grid-strategy-storage.ts` | 新增 | 持久化公开类型和 schema v1 常量 |
| `src/lib/grid/grid-strategy-storage.ts` | 新增 | JSONB 解析、名称校验、配置比较 |
| `src/lib/grid/grid-strategy-workflow.ts` | 新增 | 保存按钮状态和未保存状态纯函数 |
| `src/lib/grid/grid-strategy-pending-save.ts` | 新增 | OAuth 回跳临时快照读写 |
| `src/lib/supabase/grid-strategy-repository.ts` | 新增 | `grid_strategies` CRUD 与错误映射 |
| `src/hooks/use-grid-params.ts` | 修改 | 增加整体替换参数能力 |
| `src/hooks/use-grid-strategy-persistence.ts` | 新增 | session、列表、CRUD、待保存/待打开策略库的 OAuth 回跳编排 |
| `src/components/auth/login-modal.tsx` | 修改 | 登录标题和说明可配置，保留原默认值 |
| `src/components/grid/grid-strategy-name-modal.tsx` | 新增 | 新建/改名共用的名称表单 |
| `src/components/grid/grid-strategy-library-drawer.tsx` | 新增 | “我的策略”列表、打开、改名、删除 UI |
| `src/components/grid/grid-params-summary-bar.tsx` | 修改 | 增加保存/更新按钮 |
| `src/app/view/grid/page.tsx` | 修改 | 结果原子状态、草稿/快照分离、页面编排 |
| `src/app/view/grid/grid.css` | 修改 | 页头动作区、列表和窄屏按钮样式 |
| `__tests__/grid/grid-strategy-storage.test.ts` | 新增 | 快照解析和配置比较测试 |
| `__tests__/grid/grid-strategy-workflow.test.ts` | 新增 | 保存按钮和丢弃判断测试 |
| `__tests__/grid/grid-strategy-pending-save.test.ts` | 新增 | sessionStorage 临时恢复测试 |
| `__tests__/grid/grid-strategy-repository.test.ts` | 新增 | Repository 查询和错误测试 |
| `__tests__/grid/use-grid-params.test.ts` | 新增 | 整体替换参数测试 |
| `__tests__/grid/use-grid-strategy-persistence.test.ts` | 新增 | session、pending restore、列表和 CRUD 编排测试 |
| `e2e/grid-strategy.spec.ts` | 修改 | 公开流程和未登录入口回归 |
| `e2e/grid-strategy-authenticated.spec.ts` | 新增 | 双账号真实 RLS 与 CRUD 流程 |

任务依赖：

```text
Task 0 分支/基线
  ├─ Task 1 表契约 → 数据库 migration
  └─ Task 2 类型与纯函数
       ├─ Task 3 Repository
       ├─ Task 4 参数/工作流状态
       └─ Task 5 OAuth 临时恢复
            └─ Task 6 持久化 Hook
                 └─ Task 7 UI 组件
                      └─ Task 8 页面集成
                           └─ Task 9 E2E、构建、审查和发布
```

---

## 7. 逐任务实施步骤

### Task 0：隔离工作区并建立验证基线

**仓库：**

- `/Users/abnersun/Downloads/code/stock-charts`
- `/Users/abnersun/Downloads/code/scheduled-tasks`

**产出：** 两个仓库各自在 `codex/grid-strategy-save` 功能分支或独立 worktree 中工作；不覆盖现有 `scheduled-tasks` 的 `codex/add-etf-513970` 分支。

- [ ] **Step 1：检查两个仓库工作区**

```bash
git -C /Users/abnersun/Downloads/code/stock-charts status --short --branch
git -C /Users/abnersun/Downloads/code/scheduled-tasks status --short --branch
```

预期：确认 `stock-charts` 只有本计划文档未跟踪；确认 `scheduled-tasks` 当前分支和改动归属。发现用户改动时不得清理或覆盖。

- [ ] **Step 2：按权限允许的方式创建隔离分支/worktree**

分支统一命名为 `codex/grid-strategy-save`。若目标仓当前承载其他任务，使用 `superpowers:using-git-worktrees` 建独立 worktree，不在原分支叠加改动。

- [ ] **Step 3：运行前端基线测试**

```bash
cd /Users/abnersun/Downloads/code/stock-charts
npm test -- --runInBand __tests__/grid-validate-params.test.ts __tests__/grid-run-calculation.test.ts
```

预期：既有网格参数和运行计算测试全部通过；若失败，先记录为基线问题，不将其伪装成本功能回归。

- [ ] **Step 4：运行既有网格 E2E 基线**

```bash
npm run test:e2e -- e2e/grid-strategy.spec.ts
```

预期：公开生成、修改参数、全宽表格和下载 PNG 流程通过。若环境因端口权限失败，记录完整错误并在允许监听端口的环境复验。

---

### Task 1：先固化表契约，再新增 `grid_strategies` migration 与 RLS

**Files:**

- Create: `docs/superpowers/specs/2026-08-07-grid-strategy-save-design.md`
- Create: `/Users/abnersun/Downloads/code/scheduled-tasks/src/scheduled_tasks/models/migrations/20260807_grid_strategies.sql`
- Modify: `/Users/abnersun/Downloads/code/scheduled-tasks/doc/supabase-schema.md`

**Interfaces:**

- Produces: 先在 `stock-charts` 产出跨仓表契约，再在 `scheduled-tasks` 产出 `public.grid_strategies`，供 Task 3 的 `GridStrategyRepository` 使用。
- Security contract: `authenticated` 仅能 CRUD `user_id = auth.uid()` 的行；`anon` 没有表权限和 policy。

- [ ] **Step 1：先写并提交跨仓表契约**

新建 `docs/superpowers/specs/2026-08-07-grid-strategy-save-design.md`，至少固化：

- `grid_strategies` 保存计算器配置和历史结果快照，不复用 `grid_plans` 交易执行账本。
- 8 个字段的物理类型、约束、索引和 `updated_at` 语义。
- 名称按 `lower(btrim(name))` 在同一 `user_id` 内唯一，并以 `StrategyA` / ` strategya ` 作为冲突示例。
- 先撤销 `public`、`anon`、`authenticated` 的现有表权限，再仅授予 `authenticated` owner-only CRUD；`public` / `anon` 无 grant，不走家庭白名单。
- 本期仅允许 v1；引入 v2 时按“读取端支持 v2 → migration 放宽/替换 CHECK → 启用 v2 写入”演进。
- 双仓顺序为“本仓 spec → `scheduled-tasks` migration/数据库文档 → 本仓 Repository/UI”。

先单独提交该 spec，再开始编写 migration：

```bash
git add docs/superpowers/specs/2026-08-07-grid-strategy-save-design.md
git commit -m "docs(grid): 固化策略保存表契约"
```

- [ ] **Step 2：先写数据库验收查询**

在 migration 文件尾部注释中记录以下验收 SQL，实施时通过 Supabase MCP `execute_sql` 或等价只读查询执行：

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'grid_strategies'
order by ordinal_position;

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'grid_strategies'
order by cmd;

select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'grid_strategies'
order by indexname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'grid_strategies'
order by grantee, privilege_type;
```

应用 migration 前预期第一条返回 0 行；这证明测试能捕获表尚未创建。

- [ ] **Step 3：编写幂等 migration**

SQL 必须包含以下结构：

```sql
create table if not exists public.grid_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  schema_version integer not null default 1,
  config jsonb not null,
  result_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grid_strategies_name_check
    check (char_length(btrim(name)) between 1 and 50),
  constraint grid_strategies_schema_version_check
    check (schema_version = 1),
  constraint grid_strategies_config_object_check
    check (jsonb_typeof(config) = 'object'),
  constraint grid_strategies_result_object_check
    check (jsonb_typeof(result_snapshot) = 'object')
);

create unique index if not exists grid_strategies_user_name_uidx
  on public.grid_strategies (user_id, lower(btrim(name)));

create index if not exists grid_strategies_user_updated_idx
  on public.grid_strategies (user_id, updated_at desc);
```

随后显式 `enable row level security`，逐个 `drop policy if exists` 后创建
`grid_strategies_select_own`、`insert_own`、`update_own`、`delete_own`。UPDATE policy 必须同时有 `using` 和 `with check`。最后执行：

```sql
revoke all on table public.grid_strategies
from public, anon, authenticated;

grant select, insert, update, delete
on public.grid_strategies
to authenticated;
```

不得给 `public` / `anon` 授权，不得创建 `security definer` 函数。先 revoke 后精确 grant 是必需项：既覆盖目标库默认权限，也确保幂等 migration 遇到旧表时不会保留多余 grant。

本期保留 `check (schema_version = 1)`。未来升级 v2 时不得直接写入 v2；必须先部署兼容 v2 的读取端，再新增 migration 放宽或替换 `grid_strategies_schema_version_check`，最后才允许 v2 writer 上线。

- [ ] **Step 4：补数据库文档**

在 `doc/supabase-schema.md` 的驾驶舱表说明旁新增“网格计算器保存表”小节，明确：

- `grid_strategies` 是配置/结果快照，不是 `grid_plans` 执行计划。
- 业务行由 `stock-charts` UI 写入。
- RLS 仅按 owner，不走家庭白名单。

- [ ] **Step 5：在目标 Supabase 应用 migration**

先确认目标 project ref；使用该项目既有 migration 流程应用一次。不要用浏览器客户端执行 DDL，不要在代码中保存数据库密码或 service role key。

- [ ] **Step 6：执行验收查询和 advisors**

预期：

- 8 个字段全部存在且约束正确。
- 4 条 policy 分别对应 SELECT/INSERT/UPDATE/DELETE。
- `authenticated` 恰好有 `select, insert, update, delete` 四项表权限，`public` / `anon` 无权限。
- 唯一索引和按更新时间列表索引存在。
- Supabase advisors 不新增 `rls_disabled_in_public`、缺 policy 或未索引外键告警。

- [ ] **Step 7：提交数据库改动**

```bash
git add src/scheduled_tasks/models/migrations/20260807_grid_strategies.sql doc/supabase-schema.md
git commit -m "feat(grid): 增加网格策略保存表"
```

---

### Task 2：定义持久化类型、解析器和配置比较

**Files:**

- Create: `src/types/grid-strategy-storage.ts`
- Create: `src/lib/grid/grid-strategy-storage.ts`
- Test: `__tests__/grid/grid-strategy-storage.test.ts`

**Interfaces:**

- Consumes: `GridParams`、`GridRunResult`。
- Produces: `GRID_STRATEGY_SCHEMA_VERSION`、`GridStrategyConfigV1`、`GridStrategyMetadata`、`SavedGridStrategyV1`、`parseGridStrategyMetadata()`、`parseSavedGridStrategy()`、`normalizeGridStrategyName()`、`isSameGridStrategyConfig()`。

- [ ] **Step 1：写合法快照失败测试**

测试用真实计算器生成 fixture，禁止手写不完整结果：

```ts
const validation = validateGridParams(DEFAULT_GRID_PARAMS);
const result = runGridCalculation(
  DEFAULT_GRID_PARAMS,
  { dynamicGridEnabled: false, dynamicGridMode: 'stable' },
  validation
);

const row = {
  id: 'strategy-1',
  name: '沪深300低吸',
  schema_version: 1,
  config: {
    params: DEFAULT_GRID_PARAMS,
    dynamicGridEnabled: false,
    dynamicGridMode: 'stable',
  },
  result_snapshot: result,
  created_at: '2026-08-07T01:00:00.000Z',
  updated_at: '2026-08-07T02:00:00.000Z',
};

expect(parseSavedGridStrategy(row)).toMatchObject({
  id: 'strategy-1',
  name: '沪深300低吸',
  schemaVersion: 1,
  resultSnapshot: result,
});
```

运行：

```bash
npm test -- --runInBand __tests__/grid/grid-strategy-storage.test.ts
```

预期：FAIL，提示模块或导出尚不存在。

- [ ] **Step 2：写非法数据失败测试**

至少覆盖：

- `schema_version=2` → “该策略版本暂不支持”。
- `config.params.basePrice=NaN`、缺失 `budgetMode`、非法动态模式。
- `result_snapshot.stressTest=null`、`gridData=[]`、`calculationErrors` 非空。
- 根节点不是对象。
- 名称 trim 后为空或超过 50 字。

- [ ] **Step 3：实现类型契约**

```ts
export const GRID_STRATEGY_SCHEMA_VERSION = 1 as const;

export interface GridStrategyConfigV1 {
  params: GridParams;
  dynamicGridEnabled: boolean;
  dynamicGridMode: 'stable' | 'aggressive';
}

export type GridStrategySnapshotV1 = GridRunResult;

export interface GridStrategyMetadata {
  id: string;
  name: string;
  schemaVersion: typeof GRID_STRATEGY_SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
}

export interface SavedGridStrategyV1 extends GridStrategyMetadata {
  config: GridStrategyConfigV1;
  resultSnapshot: GridStrategySnapshotV1;
}

export interface GridStrategySavePayload {
  config: GridStrategyConfigV1;
  resultSnapshot: GridStrategySnapshotV1;
}
```

- [ ] **Step 4：实现严格解析和比较**

实现规则：

- 对 `GridParams` 的 17 个数值字段逐个检查 `typeof value === 'number' && Number.isFinite(value)`。
- `budgetMode` 只允许 `auto/manual`；动态模式只允许 `stable/aggressive`。
- 快照要求 `gridData`、`legs`、`aggregatedRows` 非空数组，`stressTest` 非 null，`calculationErrors` 为空数组。
- `normalizeGridStrategyName(name)` 返回 trim 后名称；不合法时抛中文错误。
- `isSameGridStrategyConfig()` 逐字段比较固定结构，不使用 `JSON.stringify`，避免属性顺序影响结果。
- 数据库 snake_case 只在解析边界映射成 camelCase，不向页面泄漏行结构。

- [ ] **Step 5：运行测试并补边界**

```bash
npm test -- --runInBand __tests__/grid/grid-strategy-storage.test.ts
```

预期：全部 PASS。

- [ ] **Step 6：提交类型与纯函数**

```bash
git add src/types/grid-strategy-storage.ts src/lib/grid/grid-strategy-storage.ts __tests__/grid/grid-strategy-storage.test.ts
git commit -m "feat(grid): 定义网格策略快照契约"
```

---

### Task 3：实现 Supabase Repository

**Files:**

- Create: `src/lib/supabase/grid-strategy-repository.ts`
- Test: `__tests__/grid/grid-strategy-repository.test.ts`

**Interfaces:**

- Consumes: Task 2 的类型、解析器和名称规范化函数。
- Produces: `GridStrategyRepository` 六个 CRUD 方法。

- [ ] **Step 1：构建可观察查询链 mock**

测试 mock 必须能断言 `.select()`、`.eq()`、`.order()`、`.insert()`、`.update()`、`.delete()`、`.maybeSingle()` 的调用参数；`auth.getUser()` 固定返回 `user-1`。

- [ ] **Step 2：写列表与详情失败测试**

断言：

```ts
await repo.list();
expect(select).toHaveBeenCalledWith(
  'id,name,schema_version,created_at,updated_at'
);
expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
expect(order).toHaveBeenCalledWith('updated_at', { ascending: false });
```

`get('strategy-1')` 必须同时过滤 `user_id` 和 `id`，读取完整 JSONB 后调用 Task 2 解析器。

- [ ] **Step 3：写 CRUD 与错误失败测试**

覆盖：

- `create()` trim 名称、写 `user_id`、版本、config 和 snapshot。
- `update()` 只写 config、snapshot、`updated_at`，不写 name/user_id。
- `rename()` 只写规范化名称和 `updated_at`。
- `delete()` 返回被删除 id；0 行时视为不存在/无权。
- `23505` → “已有同名策略，请更换名称”。
- `42501` → “没有权限访问该策略”。
- `getUser()` 无用户或报错 → “登录状态已失效，请重新登录”。

运行：

```bash
npm test -- --runInBand __tests__/grid/grid-strategy-repository.test.ts
```

预期：FAIL，Repository 尚不存在。

- [ ] **Step 4：实现 Repository**

方法签名固定为：

```ts
export class GridStrategyRepository {
  constructor(private readonly client: SupabaseClient) {}
  list(): Promise<GridStrategyMetadata[]>;
  get(id: string): Promise<SavedGridStrategyV1>;
  create(name: string, payload: GridStrategySavePayload): Promise<SavedGridStrategyV1>;
  update(id: string, payload: GridStrategySavePayload): Promise<SavedGridStrategyV1>;
  rename(id: string, name: string): Promise<GridStrategyMetadata>;
  delete(id: string): Promise<void>;
}
```

所有查询先 `requireUserId()`，并显式 `.eq('user_id', userId)`；这既是防御性过滤，也让 Postgres 能使用 owner 索引。更新、改名和删除还必须 `.eq('id', id)`。

- [ ] **Step 5：运行 Repository 与解析器测试**

```bash
npm test -- --runInBand __tests__/grid/grid-strategy-repository.test.ts __tests__/grid/grid-strategy-storage.test.ts
```

预期：全部 PASS。

- [ ] **Step 6：提交 Repository**

```bash
git add src/lib/supabase/grid-strategy-repository.ts __tests__/grid/grid-strategy-repository.test.ts
git commit -m "feat(grid): 增加网格策略云端仓储"
```

---

### Task 4：建立草稿、生成结果与保存状态契约

**Files:**

- Modify: `src/hooks/use-grid-params.ts`
- Create: `src/lib/grid/grid-strategy-workflow.ts`
- Test: `__tests__/grid/use-grid-params.test.ts`
- Test: `__tests__/grid/grid-strategy-workflow.test.ts`

**Interfaces:**

- Produces: `replaceParams()`、`getGridStrategySaveState()`、`hasDiscardableGridChanges()`。

- [ ] **Step 1：写 `replaceParams` 失败测试**

使用 React 18 `createRoot` + `act` 挂载最小测试组件，不新增 Testing Library。调用 `replaceParams({...DEFAULT_GRID_PARAMS, basePrice: 2})` 后断言 Hook 输出参数、校验和 `priceDecimals` 同步刷新。

- [ ] **Step 2：写保存状态表驱动测试**

固定输出联合类型：

```ts
export interface GridStrategySaveState {
  label: '保存策略' | '更新策略' | '已保存';
  disabled: boolean;
  reason: string | null;
}
```

测试矩阵：

| 有结果 | 当前云端 ID | 草稿脏 | 已生成结果待保存 | 预期 |
| --- | --- | --- | --- | --- |
| 否 | 否 | 否 | 否 | 保存策略 disabled |
| 是 | 否 | 否 | 是 | 保存策略 enabled |
| 是 | 否 | 是 | 是 | 保存策略 disabled，先重新生成 |
| 是 | 是 | 否 | 否 | 已保存 disabled |
| 是 | 是 | 否 | 是 | 更新策略 enabled |
| 是 | 是 | 是 | 任意 | 更新策略 disabled，先重新生成 |

- [ ] **Step 3：写放弃确认测试**

`hasDiscardableGridChanges()` 在以下情况返回 true：未保存的新结果、已加载策略的新生成结果、尚未重新生成的草稿；已加载且未修改返回 false。

- [ ] **Step 4：实现最小逻辑**

`replaceParams` 使用 `setParams(next)`；纯函数只接受布尔状态，不读取 React 或浏览器全局。

- [ ] **Step 5：运行测试**

```bash
npm test -- --runInBand __tests__/grid/use-grid-params.test.ts __tests__/grid/grid-strategy-workflow.test.ts
```

预期：全部 PASS。

- [ ] **Step 6：提交状态契约**

```bash
git add src/hooks/use-grid-params.ts src/lib/grid/grid-strategy-workflow.ts __tests__/grid/use-grid-params.test.ts __tests__/grid/grid-strategy-workflow.test.ts
git commit -m "refactor(grid): 分离草稿与已生成策略状态"
```

---

### Task 5：实现 OAuth 回跳临时快照

**Files:**

- Create: `src/lib/grid/grid-strategy-pending-save.ts`
- Test: `__tests__/grid/grid-strategy-pending-save.test.ts`

**Interfaces:**

- Consumes: `GridStrategySavePayload` 和 Task 2 解析能力。
- Produces: `PENDING_GRID_STRATEGY_SAVE_KEY`、`writePendingGridStrategySave()`、`readPendingGridStrategySave()`、`clearPendingGridStrategySave()`。

- [ ] **Step 1：写 round-trip 失败测试**

使用 jsdom `window.sessionStorage`：写入合法 payload 后可原样读回；读取成功不会自动删除，由调用方确认恢复后显式清理。

- [ ] **Step 2：写损坏/过期测试**

存储包装结构：

```ts
interface PendingGridStrategySaveV1 {
  version: 1;
  savedAt: string;
  payload: GridStrategySavePayload;
}
```

规则：超过 30 分钟、版本不支持、JSON 损坏或 payload 校验失败时，读取返回 null 并删除键。

- [ ] **Step 3：实现 storage 注入**

函数接收 `Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>`，避免在纯函数模块顶层访问 `window`，便于 SSR 和单测。

- [ ] **Step 4：运行测试**

```bash
npm test -- --runInBand __tests__/grid/grid-strategy-pending-save.test.ts __tests__/grid/grid-strategy-storage.test.ts
```

预期：全部 PASS。

- [ ] **Step 5：提交临时恢复模块**

```bash
git add src/lib/grid/grid-strategy-pending-save.ts __tests__/grid/grid-strategy-pending-save.test.ts
git commit -m "feat(grid): 支持登录回跳恢复待保存策略"
```

---

### Task 6：实现持久化 Hook 和登录复用

**Files:**

- Create: `src/hooks/use-grid-strategy-persistence.ts`
- Modify: `src/components/auth/login-modal.tsx`
- Test: `__tests__/family-finance/auth.test.ts`
- Test: `__tests__/grid/use-grid-strategy-persistence.test.ts`

**Interfaces:**

- Consumes: `createBrowserSupabaseClient()`、`getBrowserSession()`、Repository、pending-save 模块与 `grid:pending-library:v1` 登录意图。
- Produces: session、列表状态和 CRUD actions；通过回调把云端/临时策略交给页面恢复。

library 意图使用固定结构，由 Hook 读写并校验 30 分钟有效期：

```ts
interface PendingGridStrategyLibraryV1 {
  version: 1;
  requestedAt: string;
}
```

Hook 接口固定为：

```ts
interface UseGridStrategyPersistenceOptions {
  onOpenStrategy: (strategy: SavedGridStrategyV1) => void;
  onRestorePendingSave: (payload: GridStrategySavePayload) => void;
  onDeleteCurrentStrategy: () => void;
}

interface UseGridStrategyPersistenceReturn {
  user: User | null;
  authLoading: boolean;
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  libraryOpen: boolean;
  strategies: GridStrategyMetadata[];
  listLoading: boolean;
  listError: string | null;
  currentStrategy: GridStrategyMetadata | null;
  openLibrary: () => Promise<void>;
  closeLibrary: () => void;
  openStrategy: (id: string) => Promise<void>;
  createStrategy: (name: string, payload: GridStrategySavePayload) => Promise<void>;
  updateCurrentStrategy: (payload: GridStrategySavePayload) => Promise<void>;
  renameStrategy: (id: string, name: string) => Promise<void>;
  deleteStrategy: (id: string) => Promise<void>;
  requireLoginForSave: (payload: GridStrategySavePayload) => boolean;
  handleSignedOut: () => void;
}
```

- [ ] **Step 1：扩展 LoginModal 契约测试**

保持现有家庭财务调用不传新 props 时文案不变；新增 props：

```ts
title?: string;
description?: string;
```

网格传入自定义文案，不添加“授权账号/白名单”描述。

- [ ] **Step 2：写持久化 Hook 失败测试**

使用 React 18 `createRoot` + `act` 挂载最小 Harness，并 mock `getBrowserSession()`、Repository 和 sessionStorage。覆盖：

- 无 session 时不自动弹窗、不读取列表，公开页面可继续工作。
- 有 session 且存在合法 pending payload 时调用 `onRestorePendingSave`，随后清理 key。
- 有 session 且存在未过期 `grid:pending-library:v1` 时先打开 Drawer，再加载元数据；成功后清理 key。
- library 意图过期、版本错误或 JSON 损坏时清理 key 且不打开 Drawer；列表请求失败时 Drawer 保留错误/重试态且暂不清理 key。
- `openLibrary()` 在已登录时只查询元数据并打开 Drawer；未登录时写入 library 意图并打开登录弹窗。
- pending-save 与 pending-library 同时存在时以最后一次用户操作为准，写入新意图会清理另一个键。
- `openStrategy()` 成功后调用 `onOpenStrategy` 并设置 currentStrategy。
- create/update/rename/delete 成功后列表保持 `updatedAt desc`。
- Repository 报会话失效时打开登录弹窗，但不触发页面清空回调。

运行：

```bash
npm test -- --runInBand __tests__/grid/use-grid-strategy-persistence.test.ts
```

预期：FAIL，Hook 尚不存在。

- [ ] **Step 3：实现 session 初始化和 pending restore**

首次 effect：

1. `getBrowserSession()`。
2. 有 session 时设置 user，并读取最后一个未过期登录意图。
3. pending-save：恢复后清理两个意图键并调用 `onRestorePendingSave`。
4. pending-library：先打开 Drawer 展示 loading，再加载元数据；成功后清理两个意图键，失败时在 Drawer 中显示错误/重试并保留意图，但过期时必须清理。
5. 无 session 保持公开计算器，不自动弹登录。

- [ ] **Step 4：实现列表与 CRUD**

- `openLibrary()`：无 session 时先清理 pending-save，写入带 30 分钟过期时间的 `grid:pending-library:v1`，再打开登录弹窗；有 session 时加载元数据并打开 Drawer。
- `closeLibrary()`：关闭 Drawer 并清理 pending-library，避免用户主动关闭失败态后刷新页面又自动打开。
- `openStrategy()`：详情成功解析后更新 `currentStrategy`，再调用 `onOpenStrategy`。
- 创建、更新、改名成功后以 Repository 返回值更新内存列表，保持 `updatedAt desc`。
- 删除当前记录时清空 `currentStrategy` 并调用 `onDeleteCurrentStrategy`。
- 任一 Repository 会话失效错误都打开登录弹窗，但不得清空页面快照。

- [ ] **Step 5：实现未登录保存入口**

`requireLoginForSave(payload)`：已登录返回 false；未登录先清理 `grid:pending-library:v1`，再写入 pending-save、打开登录弹窗并返回 true。用户关闭登录弹窗时保留临时 payload 30 分钟；用户继续修改并再次保存时覆盖旧 payload。

- [ ] **Step 6：实现登出清理**

`handleSignedOut()` 清空 user、currentStrategy、列表、错误和两个 pending 意图键，但不直接修改网格计算状态。页面调用它之前必须先快照 `wasCloud = currentStrategy !== null`，不得在 Hook 清空 `currentStrategy` 后再判断内容来源。

- [ ] **Step 7：运行相关测试**

```bash
npm test -- --runInBand __tests__/family-finance/auth.test.ts __tests__/grid/use-grid-strategy-persistence.test.ts __tests__/grid/grid-strategy-pending-save.test.ts __tests__/grid/grid-strategy-repository.test.ts
```

预期：家庭财务登录回归和新增持久化基础测试全部 PASS。

- [ ] **Step 8：提交 Hook 与登录泛化**

```bash
git add src/hooks/use-grid-strategy-persistence.ts src/components/auth/login-modal.tsx __tests__/family-finance/auth.test.ts __tests__/grid/use-grid-strategy-persistence.test.ts
git commit -m "feat(grid): 编排策略登录与云端操作"
```

---

### Task 7：实现名称弹窗和策略抽屉

**Files:**

- Create: `src/components/grid/grid-strategy-name-modal.tsx`
- Create: `src/components/grid/grid-strategy-library-drawer.tsx`
- Modify: `src/app/view/grid/grid.css`

**Interfaces:**

名称弹窗：

```ts
interface GridStrategyNameModalProps {
  open: boolean;
  mode: 'create' | 'rename';
  initialName?: string;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void>;
}
```

策略抽屉：

```ts
interface GridStrategyLibraryDrawerProps {
  open: boolean;
  strategies: GridStrategyMetadata[];
  currentStrategyId: string | null;
  loading: boolean;
  error: string | null;
  actionId: string | null;
  onClose: () => void;
  onRetry: () => void;
  onOpenStrategy: (id: string) => void;
  onRenameStrategy: (strategy: GridStrategyMetadata) => void;
  onDeleteStrategy: (strategy: GridStrategyMetadata) => void;
}
```

- [ ] **Step 1：实现名称弹窗**

- 每次打开时以 `initialName ?? ''` 重置输入。
- trim 后为空或超过 50 字禁用确认。
- 提交期间禁止关闭和重复提交。
- Repository 错误显示在输入下方，错误时保留名称。

- [ ] **Step 2：实现策略抽屉**

- 桌面右侧 420px；移动端底部 90% 高度，与参数 Drawer 行为一致。
- 行内容：名称、最后更新时间、当前策略标识、打开按钮、更多菜单中的改名/删除。
- loading 显示 `Spin`；空态显示“还没有保存的策略”；错误显示重试按钮。
- 删除只触发父层确认，不在组件内调用 Repository。

- [ ] **Step 3：补响应式样式**

- 页头动作区桌面横排、窄屏换行。
- 摘要栏按钮组在小屏保持最小 44px 点击高度。
- 新样式全部放在 `.grid-shell` 作用域，不修改全局 token。

- [ ] **Step 4：运行 TypeScript 构建检查**

```bash
npm run build
```

预期：新组件类型通过；本 Task 不修改已被 `page.tsx` 使用的 `GridParamsSummaryBar` 必填 props，因此中间提交仍可独立构建。

- [ ] **Step 5：提交 UI 组件**

```bash
git add src/components/grid/grid-strategy-name-modal.tsx src/components/grid/grid-strategy-library-drawer.tsx src/app/view/grid/grid.css
git commit -m "feat(grid): 增加策略名称与列表界面"
```

---

### Task 8：集成网格页面完整工作流

**Files:**

- Modify: `src/app/view/grid/page.tsx`
- Modify: `src/components/grid/grid-params-summary-bar.tsx`
- Modify: `e2e/grid-strategy.spec.ts`

**Interfaces:**

- Consumes: Tasks 2～7 的类型、纯函数、Hook 和组件。
- Produces: 公开计算、云端保存、打开、覆盖、改名、删除的完整用户路径。

- [ ] **Step 1：先扩展未登录 E2E**

新增断言：

```ts
await page.goto('/view/grid');
await page.getByRole('button', { name: '生成策略' }).click();
await expect(page.getByRole('button', { name: '保存策略' })).toBeVisible();
await expect(page.getByRole('button', { name: '保存策略' })).toBeEnabled();
await page.getByRole('button', { name: '保存策略' }).click();
await expect(page.getByRole('dialog', { name: '登录以保存网格策略' })).toBeVisible();
await expect(page.getByText(/家庭账号|已授权/)).toHaveCount(0);
```

页头「我的策略」未登录时同样打开该登录弹窗。运行该文件，预期新增测试 FAIL。

- [ ] **Step 2：收敛结果状态**

将八个分散结果 state 替换为：

```ts
const [result, setResult] = useState<GridRunResult | null>(null);
const [generatedConfig, setGeneratedConfig] = useState<GridStrategyConfigV1 | null>(null);
const [generatedDirty, setGeneratedDirty] = useState(false);
```

首次生成成功时必须在同一次状态转换中设置 `result`、当时配置和 `generatedDirty=true`，确保无云端 ID 的新结果立即可保存。已加载策略重新生成成功时同样设为 true；生成失败不得把失败结果标为可保存。所有结果组件改为从 `result` 解构，摘要条从 `generatedConfig.params` 读取。

- [ ] **Step 3：接入持久化 Hook**

回调行为固定：

- `onOpenStrategy`：`replaceParams`、恢复动态选项、设置 generatedConfig/result、关闭参数 Drawer、`generatedDirty=false`。
- `onRestorePendingSave`：恢复相同状态，显式设置 `generatedDirty=true`，将其视为未保存新策略并打开名称弹窗。
- `onDeleteCurrentStrategy`：保留 generatedConfig/result，`generatedDirty=true`，使按钮转为“保存策略”。

- [ ] **Step 4：原子扩展摘要栏并实现保存和更新**

在同一 Task 中为 `GridParamsSummaryBar` 新增必填 props，并同步修改 `page.tsx` 调用点，不允许出现组件签名已改但页面尚未传参的中间提交：

```ts
saveLabel: '保存策略' | '更新策略' | '已保存';
saveDisabled: boolean;
saveLoading: boolean;
saveReason: string | null;
onSave: () => void;
```

按钮顺序：主按钮保存/更新在前，次按钮“修改参数”在后；disabled 原因使用可见辅助文案或 Tooltip，不能只靠禁用状态表达。

- 新结果点击保存：若未登录，交给 `requireLoginForSave()`；已登录则打开 create 名称弹窗。
- create 成功：currentStrategy 指向新记录，`generatedDirty=false`，按钮显示“已保存”。
- 已加载策略重新生成成功：`generatedDirty=true`，按钮显示“更新策略”。
- update 成功：替换 currentStrategy 元数据，`generatedDirty=false`。
- `draftDirty=true` 时禁止保存/更新，并显示“请先重新生成，使参数与结果保持一致”。

- [ ] **Step 5：实现切换、改名和删除确认**

- 打开不同策略前调用 `hasDiscardableGridChanges()`；为 true 时用 `Modal.confirm`。
- 确认后才调用 `openStrategy(id)`；取消不改变页面和 Drawer。
- 改名打开 rename 名称弹窗；成功后同步当前标题和列表。
- 删除使用 `Modal.confirm`，文案明确“只删除该保存记录，不影响其他策略”。

- [ ] **Step 6：实现页头登录状态**

- 页头右侧始终显示「我的策略」。
- user 非空时显示现有 `UserMenu`。
- `UserMenu.onSignedOut` 的回调顺序固定为：先读取 `const wasCloud = currentStrategy !== null`，再调用 `handleSignedOut()` 清理 Hook 状态，最后根据 `wasCloud` 处理页面。
- `wasCloud=true` 时重置为 `DEFAULT_GRID_PARAMS`、动态默认值和 idle 状态，防止共享设备残留；`wasCloud=false` 时保留未保存的本地结果。

- [ ] **Step 7：运行公开 E2E 与网格单测**

```bash
npm test -- --runInBand __tests__/grid
npm run test:e2e -- e2e/grid-strategy.spec.ts
npm run build
```

预期：既有网格测试不回归，新增未登录入口测试 PASS，摘要栏与页面在同一提交中通过生产构建。

- [ ] **Step 8：提交页面集成**

```bash
git add src/app/view/grid/page.tsx src/components/grid/grid-params-summary-bar.tsx e2e/grid-strategy.spec.ts
git commit -m "feat(grid): 接入策略保存完整流程"
```

---

### Task 9：认证 E2E、RLS 验证、全量检查与发布

**Files:**

- Create: `e2e/grid-strategy-authenticated.spec.ts`
- Modify: `docs/superpowers/plans/2026-08-07-grid-strategy-save.md`（勾选实际完成项）

**测试前提：**

- `GRID_E2E_USER_A_STORAGE_STATE`：测试用户 A 的 Playwright storage state 绝对路径。
- `GRID_E2E_USER_B_STORAGE_STATE`：测试用户 B 的 Playwright storage state 绝对路径。
- 两个文件只存在本机/CI secret workspace，不提交仓库。
- E2E 指向非生产 Supabase；生产库不运行创建/删除自动化测试。

- [ ] **Step 1：写双账号 RLS E2E**

使用 `browser.newContext({ storageState })` 创建 A/B 两个上下文。测试流程：

1. A 生成策略并以 `E2E-${Date.now()}` 命名保存。
2. A 在“我的策略”中可见并打开该记录。
3. B 打开“我的策略”看不到 A 的名称。
4. A 修改基准价、重新生成并覆盖，刷新后仍能打开新快照。
5. A 改名，列表和结果页同步。
6. A 删除记录，列表不再显示。
7. `finally` 中用 A 的 UI 尝试清理残留测试记录。

缺少任一 storage state 时使用 `test.skip` 并输出明确原因；发布验收不接受只跑 skip，必须在非生产环境实际通过一次。

- [ ] **Step 2：验证名称唯一和异常保留**

- A 连续创建两个同名策略，第二次显示重名错误且名称弹窗不关闭。
- 路由拦截一次 `grid_strategies` REST 请求返回 500，断言页面结果仍存在且可以重试。
- 写入损坏 fixture 只能在隔离测试库通过管理员 SQL 完成；打开时显示版本/损坏提示，不清空当前正常结果。

- [ ] **Step 3：手工验证真实 OAuth 回跳**

在无登录 session 的同一浏览器标签分别验证：

1. 生成 → 保存 → GitHub 登录 → 回到 `/view/grid`：原参数和结果恢复，`generatedDirty=true`，并自动打开名称弹窗；成功恢复后 pending-save 键立即被清理。
2. 点击“我的策略” → GitHub 登录 → 回到 `/view/grid`：自动加载列表并打开 Drawer，成功后 `grid:pending-library:v1` 被清理。

取消 OAuth 时意图可保留至 30 分钟；超时后必须清理，不得恢复快照或自动打开 Drawer。

- [ ] **Step 4：运行完整自动验证**

```bash
npm test
npm run test:e2e -- e2e/grid-strategy.spec.ts e2e/grid-strategy-authenticated.spec.ts
npm run build
git diff --check
```

预期：Jest、两组 E2E、生产构建和 whitespace 检查全部通过；任何 authenticated E2E skip 必须在验收记录中说明并补真实环境复验。

- [ ] **Step 5：运行数据库最终检查**

- 重跑 Task 1 的 columns/policies/indexes/grants 查询。
- 运行 Supabase advisors。
- 确认 Data API 可访问新表；若返回 `42501`，修正 migration 中 grant，不在客户端绕过。
- 确认 grants 查询中 `public` / `anon` 无任何表权限，`authenticated` 恰好有 CRUD 四项权限。
- 确认 `anon` 无法读取任何记录，A/B 互不可见。

- [ ] **Step 6：执行代码审查**

按仓库要求重点检查：

- 参数与快照是否可能错配。
- RLS 和 Repository 是否存在 BOLA/IDOR。
- 登录失败、网络失败、解析失败是否保留用户状态。
- pending-save / pending-library 是否互斥、带过期时间，并在成功恢复后清理。
- 登出时是否在清空 `currentStrategy` 之前快照 `wasCloud`。
- 家庭财务白名单流程是否保持原样。
- `.grid-shell` 外是否出现样式污染。

- [ ] **Step 7：提交测试与文档**

```bash
git add e2e/grid-strategy-authenticated.spec.ts docs/superpowers/plans/2026-08-07-grid-strategy-save.md
git commit -m "test(grid): 完善策略保存验收覆盖"
```

- [ ] **Step 8：按顺序发布**

先合并/应用 `scheduled-tasks` migration，并确认目标库 RLS；再发布 `stock-charts`。发布后使用真实账号做“保存→打开→更新→改名→删除→退出”冒烟测试。未经用户明确允许，不直接推送 main/master。

## 非目标

- 分享链接或公开策略。
- 版本历史、另存为或自动保存。
- 跨账号协作。
- localStorage 长期保存。
- 搜索、分页或批量管理。
- 打开旧快照时自动重新计算。
