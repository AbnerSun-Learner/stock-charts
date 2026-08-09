# 网格策略保存能力：交互与 UI 重构设计

> 日期：2026-08-09  
> 范围：`/view/grid` 保存相关表面（摘要条保存区、命名浮层、「我的策略」列表）  
> 状态：已通过对话确认，待写实施计划  
> 前置：`docs/superpowers/specs/2026-08-07-grid-strategy-save-design.md`（云端契约，本设计不改）  
> 视觉基线：`docs/superpowers/specs/2026-07-26-grid-ui-coinbase-design.md`

## 1. 目标与设计读法

### 1.1 目标

在已落地的云端保存能力之上，重构保存相关**交互与 UI**：

1. 首次保存命名：自建居中浮层（非 Ant Modal 默认壳）+ GSAP 进退场与成功确认。
2. 摘要条保存区：状态岛（保存 / 更新 / 进行中 / 已保存），更新路径无命名浮层、就地成功反馈。
3. 「我的策略」：保留右侧 Drawer 骨架，重做列表、空/错/加载态与 GSAP 入场/操作反馈。

### 1.2 Design Read

网格页「保存能力」局部 redesign；受众为投研工具用户；语气贴近现有 Coinbase 浅色金融工具；动效用 GSAP 做**反馈与状态过渡**，不做营销向滚动叙事。

**Dials：** `DESIGN_VARIANCE 6` / `MOTION_INTENSITY 5` / `VISUAL_DENSITY 5`。

### 1.3 选定方案

**方案 2：自建命名浮层 + 保留 Drawer + Save Status Island**（对话已确认）。

不采用：仅换皮 Ant 默认壳（质感不够）；命名与策略库全部自建 Overlay（与「策略库保留抽屉」决策冲突且成本过高）。

### 1.4 约束

- 所有视觉 token 仍落在 `.grid-shell`；不污染全局皮肤。
- 主色锁定品牌蓝 `#0052ff` / `var(--accent)`；禁止紫渐变、大外发光、奶油报纸风。
- 不改计算器纯函数、表契约、Repository CRUD、OAuth pending-save/library 意图语义。
- 新增依赖：`gsap`、`@gsap/react`；动画仅在 `'use client'` 叶子组件，使用 `useGSAP` + `scope`，并尊重 `prefers-reduced-motion`。

### 1.5 非目标

另存为、自动保存、分享链接、策略搜索/分页、登录 Modal 换皮、整页 GSAP 滚动叙事、整页皮肤重做。

## 2. 范围与组件边界

### 2.1 改动

| 表面 | 现状 | 目标 |
| --- | --- | --- |
| 摘要条保存按钮 | Ant `Button` 三文案 | **Save Status Island**（可保存 / 更新 / 进行中 / 已保存） |
| 命名弹窗 | Ant `Modal` | **自建居中浮层**（create / rename 共用） |
| 策略库 | Ant `Drawer` + 朴素列表 | **保留 Drawer**，重做列表项、空/错/加载与动效 |

### 2.2 不改

- `getGridStrategySaveState` 及草稿/脏标记矩阵
- `grid-strategy-pending-save` / `pending-library` 与 OAuth 回跳编排
- `GridStrategyRepository` 与 RLS/表结构
- 登录 Modal 文案与「不限家庭白名单」策略
- 结果 KPI / 图表 / 网格表布局

### 2.3 预期文件

- 新增：`src/components/grid/grid-strategy-name-overlay.tsx`（替换 `grid-strategy-name-modal.tsx` 或同等职责）
- 新增或内嵌：`src/components/grid/grid-save-status-island.tsx`（可由 summary bar 内聚，若文件变长则拆出）
- 修改：`grid-params-summary-bar.tsx`、`grid-strategy-library-drawer.tsx`、`grid.css`、`page.tsx` 接线、`package.json` 依赖
- 删除或降级：`grid-strategy-name-modal.tsx`（被 overlay 替代后移除，避免双实现）
- 测试：保留 workflow / pending-save / persistence；调整 e2e 选择器至自建 `role="dialog"`

## 3. 交互流

### 3.1 首次保存（未登录）

1. 点击「保存策略」→ 写入 `pending-save` → 打开现有登录 Modal（壳不改）。
2. OAuth 回跳恢复快照 → 打开命名浮层（行为与现网一致，仅表面更换）。

### 3.2 首次保存（已登录）

1. 点击「保存策略」→ 命名浮层打开（遮罩 fade + 面板 scale/y）。
2. 校验：trim 为空或长度 > 50 → 确认禁用；服务端重名等错误显示在输入下方，浮层不关。
3. 提交中：确认钮 loading；禁止遮罩点击、Esc、关闭按钮。
4. 成功：浮层内短确认（勾选 +「已保存」，约 400–600ms）→ 退场 → 摘要条进入「已保存」岛态。
5. 成功反馈以浮层/状态岛为准；去掉重复的 `message.success('策略已保存')`（登录恢复提示「已恢复待保存策略…」可保留）。

### 3.3 更新策略

1. 已有云端 ID 且可更新时，点击「更新策略」→ **不打开命名浮层**。
2. 状态岛：可点 → 进行中 → 成功勾选 →「已保存」。
3. 失败：岛恢复为可点「更新策略」；错误统一用 `message.error`（不新增岛旁错误行）；页面数据保留。

### 3.4 禁用与已保存

- 草稿脏未重新生成：禁用 + `saveReason`（Tooltip 与/或旁注），逻辑不变。
- 「已保存」：禁用，无点击动效。

### 3.5 我的策略

1. 打开 Drawer（桌面右侧 / 移动端 bottom，placement 不变）。
2. 列表 stagger 入场；当前项「当前」标记 + accent 浅底/左边强调。
3. 打开：该项 busy loading；若有未保存变更，仍走现有放弃确认，确认前不播打开成功动效。
4. 改名：同一命名浮层 `mode=rename`；删除：现有确认，成功后该项离场动画再刷新列表。

### 3.6 Reduced motion

关闭缩放与 stagger；保留即时显隐与 loading 文案。

## 4. 视觉规格

### 4.1 共同

- 主色：`var(--accent)`；正文/次要沿用 ink / muted。
- 圆角：主 CTA pill `999px`；浮层面板 `var(--radius-card)`；列表项 `var(--radius-compact)`。
- 阴影：不超过 `var(--ds-shadow-sm)` 量级。
- 图标：优先现有 `@ant-design/icons`，不新开图标家族。

### 4.2 Save Status Island

- 高度约 44px，与摘要条「修改参数」并排。
- **可保存 / 可更新**：实心蓝 + 白字。
- **进行中**：同色底，细进度或轻脉动（transform/opacity），非巨大转圈。
- **已保存**：描边或浅底 + 勾选 +「已保存」，不可点。
- 禁用：降对比；移动端 `saveReason` 可折到按钮下方。
- 可点态 `:active` → `scale(0.98)`。

### 4.3 命名浮层

- 遮罩：ink 约 40% 透明；loading 时不可点关。
- 面板：白底、hairline、大圆角、最大宽约 420px；移动端左右各 16px。
- 结构：标题 → 标签在上的输入 → helper/错误在下 →「取消 | 主 CTA」。
- 主 CTA 实心蓝 pill；取消为描边/ghost，对比达 WCAG AA。
- 成功态：表单淡出，中央短确认，再整体退场。
- A11y：`role="dialog"`、`aria-modal`、标题关联；打开 focus 输入；Esc/遮罩关闭（非 loading）。

### 4.4 策略库列表

- 列表项更大触控区；当前项左边框或浅 accent 底（避免装饰彩点墙）。
- 「打开」：实心小 pill；更多菜单保留。
- 空态：简短文案，暗示先生成再保存；不堆插画。
- 加载：2–3 行骨架条，替代居中大 Spin（可保留轻量说明）。
- Drawer 打开时列表 stagger 微入；删除成功：该项 height/opacity 收起。

### 4.5 GSAP 时长建议

| 动作 | 时长 |
| --- | --- |
| 浮层入场 | 220–320ms |
| 浮层退场 | 180–240ms |
| 成功停留 | 400–600ms |
| 列表项 stagger | 每项 40–60ms |
| 状态岛成功 | 300–450ms |

Ease：`power2.out` 或轻 spring；避免过度弹性。实现一律 `useGSAP` + `scope` + 卸载 revert；事件回调用 `contextSafe`。

## 5. 错误处理

- 客户端校验失败：不发请求。
- 服务端/网络/Auth 失败：错误留在浮层或 message；浮层不因失败关闭；摘要条回可点。
- 删除/打开失败：不做乐观移除；清除 `actionId`，可重试。
- 放弃确认取消：不切换策略、不播打开动效。
- 双反馈：保存成功不以 toast 与浮层/岛重复庆祝。

## 6. 测试与验收

### 6.1 测试

- 保留：`__tests__/grid/grid-strategy-workflow.test.ts`、`pending-save`、`persistence`、repository。
- 调整：e2e 中 Ant Modal 标题选择器改为自建 dialog（`保存策略` / `重命名策略` / `登录以保存网格策略` 登录壳仍 Ant）。
- 手工：`prefers-reduced-motion`、移动端 bottom Drawer、OAuth 回跳后自动打开命名浮层。

### 6.2 验收清单

1. 首次保存：浮层命名 → 成功确认动画 → 摘要条「已保存」。
2. 更新：无命名浮层，状态岛完成反馈。
3. 禁用 reason（先重新生成）仍可理解。
4. 策略库：列表入场、当前高亮、打开/改名/删除可用。
5. 失败不丢页面结果；pending-save / pending-library 行为不变。
6. 亮色 Coinbase token 一致；无整页皮肤漂移。

## 7. 与既有 spec 的关系

- 数据与安全：以 `2026-08-07-grid-strategy-save-design.md` 为准，本文件不新增表或 RLS。
- 页面整体视觉：以 `2026-07-26-grid-ui-coinbase-design.md` 为准，本文件仅覆盖保存相关表面的大胆演进。
