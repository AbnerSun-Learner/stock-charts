# 成员分布饼图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将家庭财务总览「成员分布」从 Progress 列表改为 Ant Design Charts 实心饼图（spider 标签：名/金额/占比）。

**Architecture:** 抽取纯函数格式化 spider 标签；新建 `FamilyMemberDistributionPie`（dynamic Pie）；总览 Card 接入并移除 Progress。聚合仍用 `computeMemberAssetShares`。

**Tech Stack:** Next.js App Router、React 18、TypeScript、`@ant-design/charts` Pie、Jest、Ant Design Card/Empty。

## Global Constraints

- 仅 `side === 'asset'` 参与分布（已由 `computeMemberAssetShares` 保证）
- 实心饼 + spider；标签含成员名、金额、占比
- 空数据：`Empty description="无成员资产明细"`
- 不改 `FamilyAssetStructurePie` / 聚合逻辑
- 未经用户要求不 git commit

---

### Task 1: 标签格式化纯函数 + 单测

**Files:**

- Create: `src/lib/family-finance/member-distribution-pie.ts`
- Test: `__tests__/family-finance/member-distribution-pie.test.ts`

**Interfaces:**

- Produces: `formatMemberPieLabel(d: { type: string; value: number; ratio: number }): string`
- Produces: `toMemberPieData(shares: MemberShare[]): Array<{ type: string; value: number; ratio: number }>`

- [ ] **Step 1: 写失败测试**

```ts
import {
  formatMemberPieLabel,
  toMemberPieData,
} from "@/lib/family-finance/member-distribution-pie";

describe("toMemberPieData", () => {
  it("映射 MemberShare 为饼图数据", () => {
    expect(
      toMemberPieData([
        { memberId: "1", memberName: "我", amount: 1000, ratio: 0.4 },
        { memberId: "2", memberName: "配偶", amount: 1500, ratio: 0.6 },
      ])
    ).toEqual([
      { type: "我", value: 1000, ratio: 0.4 },
      { type: "配偶", value: 1500, ratio: 0.6 },
    ]);
  });
});

describe("formatMemberPieLabel", () => {
  it("包含成员名、金额与整数占比", () => {
    const label = formatMemberPieLabel({
      type: "我",
      value: 1234.5,
      ratio: 0.356,
    });
    expect(label).toContain("我");
    expect(label).toContain("36%");
    expect(label).toMatch(/¥|￥|1,234/);
  });
});
```

- [ ] **Step 2: 跑测确认失败** — `npm test -- --testPathPattern=member-distribution-pie`
- [ ] **Step 3: 实现纯函数**（金额用 `formatCny`）
- [ ] **Step 4: 跑测通过**

### Task 2: 饼图组件

**Files:**

- Create: `src/components/family/family-member-distribution-pie.tsx`

**Interfaces:**

- Consumes: `toMemberPieData`, `formatMemberPieLabel`
- Produces: `FamilyMemberDistributionPie({ shares: MemberShare[]; height?: number })`

- [ ] **Step 1: 实现组件** — dynamic Pie、`angleField=value`、`colorField=type`、实心、`label.position=spider`、`overlapDodgeY`、tooltip 金额+占比；`shares.length===0` 返回 `null`

### Task 3: 总览页接入

**Files:**

- Modify: `src/components/family/family-overview-page.tsx`

- [ ] **Step 1: 移除 Progress import/用法；Card 内渲染 `<FamilyMemberDistributionPie shares={memberShares} />`**
- [ ] **Step 2: `npm test -- --testPathPattern=family-finance` + `npm run build`**
- [ ] **Step 3: 浏览器打开 `/view/family`（需登录）核对饼图与 Empty**

## Spec coverage

| 规格项                       | Task     |
| ---------------------------- | -------- |
| 实心饼 + spider 名/金额/占比 | 1–2      |
| 替换 Progress                | 3        |
| Empty 不变                   | 3        |
| 不改聚合 / 资产结构环图      | 全局约束 |
