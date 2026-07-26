# 网格策略页 UI/UX 优化设计（Coinbase）

> 日期：2026-07-26  
> 范围：仅 `/view/grid`（`.grid-shell`）  
> 视觉参考：[VoltAgent/awesome-design-md · Coinbase DESIGN.md](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/coinbase)  
> 状态：待实现

## 1. 目标与约束

### 1.1 目标

对网格策略页做 **视觉 + 信息架构** 优化：

1. 对齐 Coinbase 浅色金融工具语言（单一品牌蓝、实心 pill CTA、卡片叠层、涨跌语义色）。
2. 解决「生成后网格表太窄」：结果态表格全宽为主角。
3. 参数进入结果态后收入摘要条，经抽屉/sheet 再编辑；步长段默认折叠为进阶项。

### 1.2 约束

- 保持浅色；与整站蓝系连续，不引入深色大 hero。
- 不改计算器纯函数、类型契约、导出 PNG 业务规则。
- 不改首页或其他工具页皮肤。
- 不引入 Coinbase 授权字体或新设计系统依赖包；系统字体栈即可。
- 权威视觉 token 仅落在 `.grid-shell`（`grid.css` + 网格页 Ant Design 主题），不污染 `globals.css` 全局语义。

### 1.3 非目标

- 云端存参、分享链接、多策略 Tab、表内就地改档位。
- 自动根据参数变更重算（必须显式「生成 / 重新生成」）。

## 2. 视觉体系（Coinbase → `grid-shell`）

| 角色 | 目标值 / 行为 |
| --- | --- |
| 画布 | `#ffffff`；软带 / 次级表面 `#f7f7f7` |
| 主色 | `#0052ff`；hover/active `#003ecc`；仅用于主 CTA、焦点环、关键链接 |
| 正文 / 次要 | ink `#0a0b0d` / body `#5b616e` |
| 分割线 | hairline `#dee1e6` |
| 涨 / 跌 | `#05b169` / `#cf202f` |
| 主按钮 | 实心蓝 **pill**（高约 44px，圆角 `999px`）；去掉渐变与装饰光晕 / hero glow |
| 卡片 | 白底 + hairline；大卡圆角 `24px`、紧凑块 `12px`；深度靠叠层，避免大阴影 |
| 内容宽 | `site-container--grid` 目标 `max-width: 90rem`（相对当前 `80rem` 加宽，服务全宽表） |
| 数字 | `tabular-nums`；主 KPI 偏展示轻字重 |
| 标题 | 中文小节标题；去掉英文 uppercase marketing eyebrow（如 `Results` / `Benchmark`） |

**明确禁止**：暗色全幅 hero、紫渐变、cream 报纸风、多色 pill 标签墙。

## 3. 信息架构与双态布局

页面存在两种互斥视图状态（由是否有有效 `gridData` + `stressTest` 驱动，可用显式 UI state 辅助）：

### 3.1 `idle`（未生成 / 无有效结果）

```
┌─────────────────────────────────────────┐
│ 页头：标题 + 一句说明（无 hero glow）      │
├──────────────┬──────────────────────────┤
│ 参数轨        │ 空态白卡                   │
│ ①② 默认展开   │                          │
│ ③ 默认折叠    │                          │
│ [生成策略]    │                          │
└──────────────┴──────────────────────────┘
```

- 栏比保持约左 4 / 右 8（`xl`）；更小断点上下堆叠。
- 校验错误贴在左栏上方；不进入 `result`。

### 3.2 `result`（生成成功）

```
┌─────────────────────────────────────────┐
│ sticky 参数摘要条 … [修改参数]            │
├─────────────────────────────────────────┤
│ 状态条（warning / stopped，如有）         │
│ 主 KPI ×4（全宽）                         │
│ 策略对比图（全宽）                         │
│ 次级 Stats 分组 + 网格明细表（全宽）       │
└─────────────────────────────────────────┘
```

- 结果区（含表）占满内容宽（容器 `max-width: 90rem`），表格明显宽于当前右栏 8/12。
- 表格列宽按内容分配；横向溢出时在表容器内滚动，不压缩整页。

### 3.3 参数分段

| 段 | 内容 | 默认 |
| --- | --- | --- |
| ① 价格边界 | 基准价、最低价、价格精度、最小交易单位 | 展开 |
| ② 资金与系数 | 总弹药 / 预算模式、单格金额、加码与留利 | 展开 |
| ③ 步长与动态 | 小/中/大网步长、动态网格开关与模式 | **折叠** |

主 CTA 文案：`idle` 为「生成策略」；抽屉内为「重新生成」。

## 4. 交互行为

### 4.1 修改参数

- 点击摘要条「修改参数」：
  - 桌面：右侧抽屉约 420px，内含完整三段参数 +「重新生成」。
  - 移动：底部 sheet，同内容。
- 抽屉内改参 **不自动重算**；仅点击「重新生成」后更新结果。
- 关闭抽屉不丢未提交编辑（与页面受控 state 一致）；再次打开仍显示当前 state。

### 4.2 生成反馈

- 成功：切到 `result`，主反馈为布局切换；可保留轻量 `message.success`；建议滚到主 KPI 区域。
- 校验失败：留在 `idle`；主按钮 disabled，旁注首条错误摘要。
- 计算失败：可展示失败说明 +「返回修改」；不假装有有效表数据。

### 4.3 主 KPI

从现有 `StatsCards` 抽出置顶四项（其余仍按「资金压力 / 滚动收益 / 底仓」分组展示在表前）：

| 主 KPI（V2） | Legacy 回退（无 `stressTest.v2` 时） |
| --- | --- |
| 预算使用率 | 总买入金额 |
| 预计最大投入 | （与总买入金额合并展示时可只显示一项，第四格用「—」占位或隐藏空卡） |
| 扣费后收益率 | 收益率 |
| 综合净利润 | 预期利润 |

有 `v2` 时必须四卡齐全；legacy 允许少卡，但不得杜撰 V2 字段。

### 4.4 Sticky

- `idle`：不要求左栏 sticky（可选增强，非必须）。
- `result`：参数摘要条桌面 sticky。

## 5. 实现边界（预期触达文件）

| 区域 | 文件（预期） |
| --- | --- |
| 页面编排 / 双态 | `src/app/view/grid/page.tsx` |
| Token / 按钮 / 容器宽 | `src/app/view/grid/grid.css` |
| Ant Design 主题 | `src/components/grid/grid-antd-provider.tsx` |
| 参数段折叠 | `base-info-config.tsx` / `fund-coefficient-config.tsx` / `grid-step-config.tsx`（或薄包装） |
| KPI 拆分 | `stats-cards.tsx`（及可能的 `primary-kpi-row` 薄组件） |
| 新增 | 参数摘要条、参数抽屉/sheet 薄组件 |
| 测试 | `e2e/grid-strategy.spec.ts` 及因文案/DOM 变更受影响的断言 |

计算层（`src/lib/grid/**`、`grid-calculator`、`grid-run-calculation`）**默认不改**。

## 6. 验收标准

1. 未生成时可配参并生成；步长段默认收起。
2. 生成后表格可视宽度明显大于当前右栏布局；顺序为 主 KPI → 图 → 次级指标 + 表。
3. 「修改参数」打开抽屉/sheet；「重新生成」后结果更新。
4. 浅色、Coinbase 实心蓝 pill；无 hero glow / 渐变主按钮。
5. 相关 `npm test`、`npm run build` 通过；本地 `/view/grid` 走通 idle → result → 改参 → 再生成。

## 7. 参考

- 现有页：`src/app/view/grid/page.tsx`、`grid.css`
- 策略计算规格（业务不变）：`docs/grid-strategy-design.md`
- 同源 Coinbase 刷新先例：`docs/superpowers/specs/2026-07-23-family-finance-coinbase-ui-refresh-design.md`
