# 家庭资产记账 · 金额显示 / 隐藏

**日期**：2026-07-28  
**状态**：已确认（方案 A）  
**路由**：`/view/family/ledger`  
**相关**：[总览金额显隐](./2026-07-24-family-amount-visibility-design.md)

## 目标

在资产记账页提供与总览一致的「金额显示 / 隐藏」：默认隐藏，标题旁眼睛切换；展示层金额为 `****`，便于旁人可见时遮挡。

## 非目标

- 不持久化（无 localStorage / 服务端）；刷新或重进页面重置为隐藏
- 不与总览页共享同一份显隐 state（各页独立，默认均隐藏）
- 不遮罩添加/编辑 Modal 内的金额输入（`InputNumber`、转移金额、`最多 ¥…` 占位）
- 不模糊、不销毁图表几何；百分比等非金额信息保留
- 不改后端 / DDL / RLS

## 产品决策

| 项       | 选择                                                       |
| -------- | ---------------------------------------------------------- |
| 范围     | 账本页**展示层**金额（表格、结构环图、成员历史图）         |
| 默认态   | 每次进入 `amountsVisible = false`                          |
| 隐藏文案 | 固定 `****`（与总览一致）                                  |
| 开关 UI  | 标题「家庭资产记账」旁：`EyeFilled` / `EyeInvisibleFilled` |
| 编辑弹窗 | 始终明文，便于录入与转移                                   |

## 架构（方案 A）

复用已有 Context，不另造并行机制：

```
FamilyLedgerPage
  useState(amountsVisible=false)
  眼睛按钮 → setAmountsVisible
  <FamilyAmountVisibilityProvider value={amountsVisible}>
    表格 formatCny(..., { visible })
    FamilyAssetStructurePie / FamilyAssetHistoryLine（内部 useFamilyAmountVisibility）
  </Provider>
```

原则与总览相同：单一真相在页级 state + Provider；遮罩经 `formatCny` / `formatCompactCny`；DOM 文本为 `****`，不用 CSS blur。

## 遮罩范围清单

| 区域         | 组件                         | 遮罩字段                                   |
| ------------ | ---------------------------- | ------------------------------------------ |
| 资产/负债表  | `FamilyLedgerPage` 列 render | `amount` 列                                |
| 资产结构环图 | `FamilyAssetStructurePie`    | 右侧标签金额、tooltip 金额                 |
| 成员资产变动 | `FamilyAssetHistoryLine`     | 「三笔钱合计」、Y 轴 compact、tooltip 金额 |

**不遮罩**：Modal 内金额相关表单项与占位文案；表格非金额列（名称、分类、成员、四笔钱、时间）。

## 本仓文件（拟）

| 路径                                                           | 职责                                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/components/family/family-ledger-page.tsx`                 | state、眼睛、Provider、表格 `visible`                                                  |
| `src/components/family/family-asset-structure-pie.tsx`         | 读 hook，标签/tooltip 遮罩                                                             |
| `src/components/family/family-asset-history-line.tsx`          | 读 hook，合计/轴/tooltip 遮罩（对齐趋势图：隐藏时 Y 轴亦 `****`）                      |
| `src/components/family/family-amount-visibility.tsx`           | 更新 hook 注释（去掉「ledger 不强制隐藏」）                                            |
| `src/app/globals.css`                                          | title-row / toggle 样式覆盖到 `.family-ledger-page`（或上提至 `.family-finance-page`） |
| `__tests__/family-finance/ledger-amount-visibility-ui.test.ts` | 账本页 header + Provider + 默认隐藏契约                                                |

## 错误与边界

- 无 Provider 时 hook 仍默认 `true`（其它未包 Provider 的复用场景向后兼容）。
- 隐藏态负数/零一律 `****`。
- 图表显隐切换若触发布局问题，可对 Line/Pie 使用 `key={amountsVisible ? 'amt-visible' : 'amt-masked'}`（与趋势图一致）。

## 测试

- 源码契约：ledger header 含眼睛图标、`FamilyAmountVisibilityProvider`、`useState(false)`，不含 Switch
- 既有 `formatCny` / 可见性单测继续有效；图表遮罩以组件读 hook 为准，可不强制加 React 渲染测

## 双仓协作

无。纯本仓 UI。
