# Stock Charts Design

## 定位

Stock Charts 是浅色机构信任风格的 ETF 投资驾驶舱。界面优先服务「看状态、看偏离、做下一步动作」，不做营销入口墙，也不做暗色交易终端。

## 视觉 Token

| 角色 | Token | 值 | 用途 |
| --- | --- | --- | --- |
| Canvas | `--canvas` | `#F8FAFC` | 页面底色 |
| Surface | `--surface` | `#FFFFFF` | 面板、表单、卡片 |
| Accent | `--accent` | `#0052FF` | CTA、焦点、关键指标 |
| Ink | `--ink` | `#0F172A` | 主文字 |
| Muted | `--muted` | `#64748B` | 辅助文字 |
| Border | `--border-subtle` | `#E2E8F0` | hairline |
| Gain | `--gain` | `#059669` | 正向、上涨 |
| Loss | `--loss` | `#DC2626` | 错误、下跌 |

## 字体

- Display 与金额：`Outfit`，用于品牌、标题、关键数字。
- Body：`DM Sans`，用于正文、导航、表单。
- 表格和金额数字使用 `tabular-nums`，避免数据刷新时视觉跳动。

## 壳层

- `.app` 使用两列 grid：侧栏轨 + 主内容轨。
- 侧栏展开宽度 `248px`，折叠宽度 `64px`，折叠状态持久化到 `localStorage`。
- 品牌固定在侧栏顶部，用户区固定在侧栏底部。
- 顶栏只放折叠按钮、面包屑和右侧登录入口；不放通知/设置 icon。
- 顶栏右侧未登录显示 `登录`，已登录显示 `登出`，登录复用 GitHub OAuth 并以登录框呈现。
- 侧栏底部用户信息只展示头像与登录状态，不使用四周描边。
- 登录、回调和错误页不强制进入 Shell；业务视图和首页进入 Shell。

## 首页结构

首页是 Workbench，不是工具营销网格：

1. 问候标题
2. 4 张 KPI 摘要卡；未登录时展示默认占位值，不强制跳转登录
3. 「需要你处理」与「最近动态」双栏；点击资产配置时未登录弹出登录框，已登录进入 `/view/dashboard`
4. 底部工具/列表区，保留现有功能入口但降低视觉主导权

## 组件原则

- Panel 使用白底 + 1px hairline，阴影只用于轻微层级。
- Primary 按钮为 Coinbase 蓝；涨跌和错误只使用 gain/loss。
- 图标优先使用 `lucide-react`。
- 首页与壳层不引入新的业务假数据写入，只展示占位状态和已有路由入口。
