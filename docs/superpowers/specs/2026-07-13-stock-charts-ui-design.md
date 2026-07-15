# Stock Charts UI 视觉与壳层设计

> 日期：2026-07-13  
> 状态：已确认（brainstorm）  
> 范围：产品视觉语言、App Shell、首页工作台；不覆盖 ETF 账本业务逻辑实现

## 1. 背景与目标

`stock-charts` 正从「投研工具卡片集」升级为「ETF 投资驾驶舱」。当前 UI 为浅灰蓝 + Ant Design 工具入口墙，与注释中的 Financial Terminal 气质不一致，也缺少可复用的 Agent 设计契约。

本设计确定：

1. 视觉方向与 token 原则
2. 与 [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) 的参照关系
3. App Shell / 首页布局（对齐同级仓库 `star-flow`）
4. 渐进落地范围（路径 B）

**非目标：** 换 UI 库、整站暗色重做、照搬第三方品牌整份 DESIGN.md、在本阶段实现完整 Dashboard 业务数据。

## 2. 决策摘要

| 项       | 结论                                                         |
| -------- | ------------------------------------------------------------ |
| 视觉气质 | 浅色机构信任（Coinbase / Wise 系）                           |
| 主色     | Coinbase 蓝（目标 `#0052FF`，可先与现有 `#2563EB` 过渡对齐） |
| 信息密度 | 均衡工作台（KPI 一行 + 主区 + 行动/列表）                    |
| 落地路径 | **B**：产品级 `DESIGN.md` + CSS/Ant token 演进               |
| 品牌名   | **Stock Charts**                                             |
| 壳层     | **完全对齐** `star-flow`（两列 grid shell）                  |
| 首页     | 对齐 `star-flow` Workbench 内容结构，替换营销四宫格          |

已否决：路径 A（整站换皮）、路径 C（仅抛光无契约）；暗色精密终端为主视觉；面包屑在顶栏之上 + 登录在顶栏右侧（被 star-flow 壳方案取代）。

## 3. awesome-design-md 参照

| 优先级     | 主题                                                                     | 用途                                   |
| ---------- | ------------------------------------------------------------------------ | -------------------------------------- |
| 主参照     | Coinbase                                                                 | 浅色信任、蓝强调、账户/资产可读性      |
| 辅参照     | Wise                                                                     | 数字清晰、语义色用法（涨跌/状态）      |
| 辅参照     | Cal.com                                                                  | 克制组件、压低 Ant Design「后台感」    |
| 局部可借   | Linear / Vercel                                                          | 字距、hairline、密度节奏；不借暗色整套 |
| 不整站采用 | Stripe 紫渐变、Kraken/Revolut 暗色交易台、Notion 暖衬线、ClickHouse 黄黑 | 与已选浅色工作台冲突                   |

落地时自建根目录 `DESIGN.md`（本产品专用），从上述主题吸收原则，禁止直接复制某一品牌文件作为权威源。

## 4. 视觉原则

1. **浅色可信**：canvas 浅灰、surface 白、单色蓝强调
2. **数字优先**：金额/偏离/收益层级明确，tabular 数字避免跳动
3. **语义色隔离**：绿/红仅用于涨跌与状态，不当品牌主色
4. **克制表面**：白底 + hairline；阴影极轻或无；避免大面积渐变、glow、玻璃拟态、装饰徽章簇
5. **均衡密度**：一屏可完成「看状态 → 看偏离 → 下一步」，不做成营销落地页

## 5. Design Tokens

### 5.1 颜色（建议）

| 角色    | 值                                | 用途                |
| ------- | --------------------------------- | ------------------- |
| canvas  | `#F8FAFC`                         | 页面底              |
| surface | `#FFFFFF`                         | 面板、表单、卡片    |
| accent  | `#0052FF`（过渡期可 `#2563EB`）   | CTA、焦点、关键指标 |
| ink     | `#0F172A`                         | 主文字              |
| muted   | `#64748B`                         | 辅助文字            |
| border  | `#E2E8F0` / `rgba(15,23,42,0.08)` | hairline            |
| gain    | `#059669`                         | 上涨/正向           |
| loss    | `#DC2626`                         | 下跌/错误           |

实现落点：`src/app/globals.css` 的 CSS 变量 + `AntdProvider` theme（`colorPrimary` 等）保持同源。

### 5.2 字体

| 角色           | 字体         | 说明                     |
| -------------- | ------------ | ------------------------ |
| Display / 金额 | Outfit       | 字重 600–650，轻微负字距 |
| Body           | DM Sans      | 正文与表单               |
| 表内数字       | tabular-nums | 对齐列                   |

须在根布局真实加载字体；禁止仅在文档声明而 CSS 仍指向 `system-ui` 空壳。

### 5.3 组件映射（Ant Design）

- Primary：实心蓝；Secondary：白底 + hairline
- Card/Panel：surface + 1px border；首页不做营销卡片墙
- Tag：浅底彩字，只表达状态
- 表格/输入：对齐 surface 与 border token；错误态用 loss

## 6. App Shell（对齐 star-flow）

参考实现：`../star-flow/web/src/App.tsx`、`components/layout/*`、`styles/global.css` 中 Layout 段。

### 6.1 结构

```text
.app (grid: --sidebar-width | 1fr; height: 100dvh)
├── app-sidebar-rail (flex column)
│   ├── SidebarBrand          ← 「Stock Charts」+ 标记
│   ├── Sidebar nav (scroll)  ← 概览 / 资产配置 / 网格 / 复盘 …
│   └── SidebarUserMenu       ← 头像、邮箱、退出（侧栏底）
└── app-main-rail (flex column)
    ├── Topbar (固定高度 ~60px)
    │   ├── 折叠按钮（左）
    │   ├── Breadcrumb（折叠右侧；首页可空）
    │   └── 登录 / 登出（右）
    └── main > main-scroll > 页面内容
```

### 6.2 行为要点

- 侧栏宽度用 CSS 变量（展开约 248px / 折叠约 64px），折叠状态可持久化（localStorage）
- 品牌在侧栏顶，**不在**顶栏
- 登录状态入口在顶栏右；侧栏底只展示用户信息，不承担登录/登出操作
- 面包屑在顶栏内，由页面通过 context/hook 注入；首页可不注册
- 登录使用弹窗呈现，复用 GitHub OAuth；回调和错误页不强制进入 Shell
- 滚动发生在侧栏导航区与主内容区内部，非整页 body 拖动顶栏

### 6.2.1 顶栏右侧：认证入口

「完全对齐 star-flow」指 **布局骨架与交互位置**（两列 grid、品牌/折叠/面包屑/用户区位置），不要求迁入 star-flow 的通知抽屉与设置业务。本项目顶栏右侧改为认证入口。

| 控件      | 本设计约定                                               |
| --------- | -------------------------------------------------------- |
| 登录/登出 | 未登录显示 `登录` 并打开登录框；已登录显示 `登出`         |
| 登录方式  | 复用 GitHub OAuth；登录成功后按回调 `next` 返回目标页     |
| 通知/设置 | 顶栏不展示通知和设置 icon；本批次不新建设置页或通知中心   |
| 折叠      | **必须可用**，切换侧栏宽                                 |
| 面包屑    | 有注册则展示；首页可空                                   |

验收以顶栏登录状态与登录框行为为准，不再包含通知/设置占位。

### 6.3 导航 IA（初版）

| 项       | 路由意图                                                                  |
| -------- | ------------------------------------------------------------------------- |
| 概览     | 首页工作台                                                                |
| 资产配置 | 目标/持仓/再平衡（驾驶舱主线）                                            |
| 网格策略 | 现有 `/view/grid` 接入 Shell                                              |
| 复盘     | 周期报告（随功能 Phase；可先占位路由）                                    |
| 旭日图   | **侧栏二级或「工具」分组下的一项**（固定挂在工具组，不与网格并列抢主 IA） |

具体 path 在实现计划中与现有 `/`、`/view/*` 迁移策略一并定义；计划须写明旧 URL 兼容或重定向。

### 6.4 响应式

- **本阶段以桌面为主**（≥960px）：完整侧栏 + 顶栏
- 窄屏可参考 star-flow：强制折叠侧栏或隐藏侧栏轨；**不作为本设计强制验收项**
- 实现计划若照抄参照 CSS 断点，须在计划中写明；否则默认仅保证桌面布局不崩

## 7. 首页（对齐 star-flow Workbench）

参考：`../star-flow/web/src/pages/Workbench.tsx`。

内容自上而下：

1. **问候标题**：`{用户名}，{上午好|下午好|晚上好}`
2. **摘要条**：4 张 summary 卡（如总资产、配置偏离、待再平衡、XIRR——未登录时展示默认占位值）
3. **双栏 grid**（约 `1.45fr / 0.9fr`）：「需要你处理」+「最近动态」；点击资产配置时未登录弹登录框，已登录进入 `/view/dashboard`
4. **列表/工具区**：表格或入口列表（替代当前四宫格营销卡）

视觉仍用本产品 Coinbase 蓝 token，不复制 star-flow 的业务文案与 AI 强调色。

## 8. 落地范围与分期

### 8.1 本设计落地批次

| 批次 | 内容                                                              |
| ---- | ----------------------------------------------------------------- |
| 1    | 根目录 `DESIGN.md`；`globals.css` / Ant theme / 字体加载对齐      |
| 2    | App Shell 组件（Sidebar / Topbar / Providers），品牌 Stock Charts |
| 3    | 首页改为 Workbench 结构（可用占位数据）                           |
| 4    | 现有旭日图、网格页包进 Shell，做 token 轻对齐                     |

### 8.2 明确不做（本设计）

- 完整 Dashboard 业务计算与真实账本接线（跟 `etf-investment-cockpit-implementation-plan` 功能 Phase）
- 整站暗色主题重做
- 更换 Ant Design / 重写网格与旭日图计算逻辑
- 在 `stock-charts` 新增 DDL / 第三方行情写库（双仓边界不变）
- 通知中心、全局设置页、star-flow 业务能力迁移

### 8.3 与功能计划文档的关系

`docs/etf-investment-cockpit-implementation-plan.md` 若仍写「在 `home-tool-grid` 增加 Dashboard 入口」，**以本 UI spec 为准**：首页主形态为 Workbench，不再以四宫格营销卡为主入口。实现计划阶段应回写功能计划中的首页表述，避免双文档并行冲突。

## 9. 验收标准

1. 任意壳内页呈现 star-flow 同构两列 Shell；品牌为 Stock Charts
2. 折叠按钮可切换侧栏宽；用户信息在侧栏底（Auth 未就绪时可占位菜单）
3. 首页为问候 + KPI + 双栏 + 列表，不再是四工具营销网格为主视觉
4. Primary 按钮与关键数字使用蓝强调；涨跌仅用 gain/loss
5. 存在可读的产品 `DESIGN.md`，与 CSS 变量命名可对应
6. 顶栏右侧为登录/登出入口；未登录点击资产配置弹登录框，已登录可进入资产配置
7. `npm run build` 通过；桌面宽度下受影响路由人工打开无布局错乱

## 10. 风险与依赖

- **Auth 未就绪**：Shell 用户区与登录页可先占位，行为与 Magic Link Phase 对齐后再接线
- **路由迁移**：现有 `/view/*` 需决定是否保留外链兼容，避免书签断裂
- **与功能计划并行**：UI 壳可先于账本 UI；勿阻塞 Phase 0/1 纯函数与 Repository

## 11. 参考路径

- 视觉灵感集合：https://github.com/VoltAgent/awesome-design-md
- 壳与首页样板：`/Users/abnersun/Downloads/code/star-flow`（尤其 `web/src/App.tsx`、`pages/Workbench.tsx`、`components/layout/*`）
- 产品功能边界：`docs/etf-investment-cockpit-implementation-plan.md`
