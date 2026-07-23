# 家庭财务总览 · 成员分布饼图

**日期**：2026-07-23  
**状态**：已实现（2026-07-23）  
**相关**：[家庭财务总览设计](./2026-07-22-family-finance-overview-design.md)、[Ant Design Charts Pie](https://ant-design-charts.antgroup.com/components/plots/pie)

## 背景

总览页「成员分布」当前用 Ant Design `Progress` 列表展示各成员资产金额与占比。产品希望改为标准饼图，图上标签同时给出成员名、金额与占比。

## 目标

- 成员资产占比用实心饼图表达（非环图）。
- 标签：`成员名` + 金额 + 占比（spider 外置标签）。
- 空数据仍显示 `Empty`（「无成员资产明细」）。
- 聚合逻辑不变：仅统计 `side === 'asset'`，继续使用 `computeMemberAssetShares`。

## 非目标

- 不改资产结构环图（`FamilyAssetStructurePie`）。
- 不保留 Progress 双呈现。
- 不改成员管理 / 记账 / 保单等其它模块。
- 不新增 DDL 或共享表写入。

## 方案

新建独立展示组件，在总览 Card 内替换 Progress。

| 项      | 选择                                                                                        |
| ------- | ------------------------------------------------------------------------------------------- |
| 组件    | `FamilyMemberDistributionPie`（`src/components/family/`）                                   |
| 图表    | `@ant-design/charts` `Pie`，`dynamic` + `ssr: false`                                        |
| 数据    | `MemberShare[]` → `{ type: memberName, value: amount, ratio }`                              |
| 形态    | 实心饼：`radius` ≈ 0.8–0.9，不设 `innerRadius`（或 0）                                      |
| 标签    | `position: 'spider'`；文案含名 / `formatCny(amount)` / `ratio` 百分比；可用 `overlapDodgeY` |
| Tooltip | 同步金额与占比                                                                              |
| 色板    | 默认色板（成员数动态，不固定 domain）                                                       |
| 容器    | 原 `Card title="成员分布"`，高度约 280–320                                                  |

## 交互与边界

- `memberShares.length === 0`：不渲染饼图，保持 Card 内 `Empty`。
- 加载中：沿用 Card `loading`，不单独骨架（与现况一致）。
- 点击扇区：无额外业务跳转（仅图表默认 highlight 即可）。

## 测试与验证

- 单元：若抽标签文案纯函数，覆盖格式化；聚合已有 `computeMemberAssetShares` 测试则不重复。
- UI：登录后打开 `/view/family`，有资产数据时成员分布为饼图且标签含名/金额/占比；无资产时 Empty。
- 构建：`npm run build`（涉及组件/类型）。

## 文件清单（预期）

| 路径                                                       | 变更                     |
| ---------------------------------------------------------- | ------------------------ |
| `src/components/family/family-member-distribution-pie.tsx` | 新增                     |
| `src/components/family/family-overview-page.tsx`           | Progress 列表 → 饼图组件 |
| `__tests__/...`（可选）                                    | 标签格式化纯函数         |

## 验收标准

1. 成员分布为实心饼图，非 Progress。
2. Spider 标签可见成员名、金额、占比。
3. Hover 可看到金额与占比。
4. 无成员资产时 Empty 文案不变。
5. 资产结构环图行为不受影响。
