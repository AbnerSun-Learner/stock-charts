# Family Finance Coinbase UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使用 Coinbase 风格统一优化 `/view/family` 与 `/view/family/ledger`，保留全部业务逻辑，并从 Ledger 删除重复的资产汇总文本。

**Architecture:** 两个页面共享 `family-finance-page` 根作用域和局部 CSS token；总览通过独立的 `FamilyFinanceMetricCard` 展示三项 KPI，Ledger 不消费 KPI 组件。页面和子组件只增加结构化 class、响应式布局及展示 props，不改变 Repository、聚合函数、图表数据或 CRUD 流程。

**Tech Stack:** Next.js 14、React 18、TypeScript strict、Ant Design 5、Tailwind CSS 4、Jest、Ant Design Charts

## Global Constraints

- Primary `#0052ff`；Primary active `#003ecc`；Ink `#0a0b0d`；Body `#5b616e`；Muted `#7c828a`。
- Hairline `#dee1e6`；Surface soft `#f7f7f7`；Surface strong `#eef0f3`。
- Positive `#05b169`；Negative `#cf202f`。
- 主要内容卡固定 `24px` 圆角；紧凑内层容器固定 `12px`；胶囊 `999px`。
- 只允许一个阴影层级：`0 4px 12px rgba(10, 11, 13, 0.04)`。
- 所有页面主题选择器必须在 `.family-finance-page` 下，不允许未限定作用域的 `.ant-card`、`.ant-table` 或 `.ant-btn`。
- `/view/family/ledger` 必须删除标题下的总资产 / 总负债 / 净资产文本，不得新增 KPI 替代。
- 不修改 `package.json`、Supabase、Repository、聚合计算、鉴权、CRUD 或图表数据含义。

---

### Task 1: Shared Family Finance Theme and Metric Card

**Files:**
- Create: `src/components/family/family-finance-metric-card.tsx`
- Modify: `src/app/globals.css`
- Test: `__tests__/family-finance/metric-card.test.ts`

**Interfaces:**
- Consumes: `formatCny(value: number): string` from `src/lib/family-finance/format.ts`
- Produces: `FamilyFinanceMetricCard({ label, value, tone, loading, hint })`
- Produces: `FamilyFinanceMetricTone = 'primary' | 'neutral' | 'positive' | 'negative'`

- [ ] **Step 1: Write the metric rendering test**

```ts
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FamilyFinanceMetricCard } from '@/components/family/family-finance-metric-card';

describe('FamilyFinanceMetricCard', () => {
  it('renders the label, formatted amount, hint, and scoped tone class', () => {
    const html = renderToStaticMarkup(
      createElement(FamilyFinanceMetricCard, {
        label: '总资产',
        value: 123456,
        tone: 'primary',
        loading: false,
        hint: '家庭当前资产合计',
      })
    );

    expect(html).toContain('总资产');
    expect(html).toContain('¥123,456.00');
    expect(html).toContain('家庭当前资产合计');
    expect(html).toContain('family-finance-metric--primary');
  });
});
```

- [ ] **Step 2: Run the test and verify the component is missing**

Run: `npm test -- --runInBand __tests__/family-finance/metric-card.test.ts`

Expected: FAIL because `family-finance-metric-card` does not exist.

- [ ] **Step 3: Implement the metric component**

Create a focused presentational component with this public shape:

```tsx
'use client';

import { Card } from 'antd';
import { formatCny } from '@/lib/family-finance/format';

export type FamilyFinanceMetricTone = 'primary' | 'neutral' | 'positive' | 'negative';

interface FamilyFinanceMetricCardProps {
  label: string;
  value: number;
  tone: FamilyFinanceMetricTone;
  loading: boolean;
  hint: string;
}

export function FamilyFinanceMetricCard({
  label,
  value,
  tone,
  loading,
  hint,
}: FamilyFinanceMetricCardProps) {
  return (
    <Card
      loading={loading}
      className={`family-finance-metric family-finance-metric--${tone}`}
    >
      <div className="family-finance-metric__label">
        <span className="family-finance-metric__marker" aria-hidden />
        {label}
      </div>
      <div className="family-finance-metric__value">{formatCny(value)}</div>
      <div className="family-finance-metric__hint">{hint}</div>
    </Card>
  );
}
```

- [ ] **Step 4: Add scoped family finance tokens and shared primitives**

Under `src/app/globals.css`, add `.family-finance-page` tokens and descendant classes for:

- page header and header actions
- primary / secondary pill actions
- 24px section cards
- metric cards and the four tone modifiers
- section eyebrow, title, description, and content
- desktop / tablet / mobile spacing

Every Ant Design selector must begin with `.family-finance-page`, for example:

```css
.family-finance-page {
  --family-primary: #0052ff;
  --family-primary-active: #003ecc;
  --family-ink: #0a0b0d;
  --family-body: #5b616e;
  --family-muted: #7c828a;
  --family-hairline: #dee1e6;
  --family-surface-soft: #f7f7f7;
  --family-surface-strong: #eef0f3;
  --family-positive: #05b169;
  --family-negative: #cf202f;
  max-width: 1200px;
  margin-inline: auto;
}

.family-finance-page .family-finance-section-card.ant-card,
.family-finance-page .family-finance-metric.ant-card {
  overflow: hidden;
  border: 1px solid var(--family-hairline);
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(10, 11, 13, 0.04);
}
```

- [ ] **Step 5: Run the test, lint, and diff boundary check**

Run:

```bash
npm test -- --runInBand __tests__/family-finance/metric-card.test.ts
npm run lint
git diff --check
```

Expected: metric test PASS, ESLint no warnings/errors, diff check no output.

- [ ] **Step 6: Commit the shared UI foundation**

```bash
git add src/components/family/family-finance-metric-card.tsx src/app/globals.css __tests__/family-finance/metric-card.test.ts
git commit -m "feat(family): 新增家庭财务页面视觉基础"
```

---

### Task 2: Family Overview Page

**Files:**
- Modify: `src/components/family/family-overview-page.tsx`
- Modify: `src/components/family/family-mental-accounts-panel.tsx`
- Modify: `src/app/globals.css`
- Test: `__tests__/family-finance/aggregates.test.ts`
- Test: `__tests__/family-finance/mental-account.test.ts`

**Interfaces:**
- Consumes: `FamilyFinanceMetricCard` from Task 1
- Consumes: existing `computeLedgerTotals`, `FamilyAssetSankey`, `FamilyMentalAccountsPanel`, and `FamilyPoliciesPage`
- Produces: `.family-finance-page.family-overview-page` scoped overview markup

- [ ] **Step 1: Run overview business regression tests before the UI change**

Run:

```bash
npm test -- --runInBand __tests__/family-finance/aggregates.test.ts __tests__/family-finance/mental-account.test.ts
```

Expected: both suites PASS.

- [ ] **Step 2: Replace the overview page shell and header**

In both populated and empty branches:

- use root `className="family-finance-page family-overview-page"`
- render one `header.family-finance-header`
- preserve `成员管理` and `/view/family/ledger` actions
- use `family-finance-secondary-action` and `family-finance-primary-action`
- retain the original `reload`, Drawer, forms, links, and click handlers unchanged

Header skeleton:

```tsx
<header className="family-finance-header">
  <div>
    <div className="family-finance-eyebrow">家庭资产</div>
    <h1>家庭财务总览</h1>
    <p>把家庭当作一家小公司，在同一张财务视图里看清资产、负债与保障。</p>
  </div>
  {headerActions}
</header>
```

- [ ] **Step 3: Replace the three Ant Statistic cards**

Render the existing totals through:

```tsx
<FamilyFinanceMetricCard
  label="总资产"
  value={totals.totalAssets}
  tone="primary"
  loading={loading}
  hint="家庭当前资产合计"
/>
<FamilyFinanceMetricCard
  label="总负债"
  value={totals.totalLiabilities}
  tone="neutral"
  loading={loading}
  hint="家庭共同负债合计"
/>
<FamilyFinanceMetricCard
  label="净资产"
  value={totals.netWorth}
  tone={totals.netWorth < 0 ? 'negative' : 'positive'}
  loading={loading}
  hint="总资产扣除总负债"
/>
```

Keep the existing `Row` / `Col` breakpoints or replace them with an equivalent three-column CSS grid that collapses to one column below 768px.

- [ ] **Step 4: Reframe the overview content sections**

- Give the asset structure Card `family-finance-section-card family-overview-structure-card`.
- Use a title node containing `h2` and a short explanation; do not change `FamilyAssetSankey` props.
- Wrap `FamilyMentalAccountsPanel` in `family-overview-mental-panel`.
- Give the embedded policy Card `family-finance-section-card family-overview-policies-card`.
- Preserve desktop two-column and mobile one-column behavior.

- [ ] **Step 5: Normalize the mental account presentation**

In `FamilyMentalAccountsPanel`:

- add `className="family-finance-section-card family-mental-accounts-card"` to the outer Card
- replace hard-coded blue account container classes with `family-mental-account-item`
- keep all modal, selectable-item, save, edit, and delete logic byte-for-byte equivalent

Add scoped CSS only under `.family-overview-page` for the account item hairline, 12px radius, soft surface, and action spacing.

- [ ] **Step 6: Style the empty state without changing behavior**

In the no-ledger branch:

- reuse the same page header
- wrap `Empty` in `family-finance-empty-card`
- retain the exact description and `/view/family/ledger` primary action
- keep `FamilyPoliciesPage embedded` available below the empty state

- [ ] **Step 7: Verify overview behavior and build**

Run:

```bash
npm test -- --runInBand __tests__/family-finance/aggregates.test.ts __tests__/family-finance/mental-account.test.ts
npm run lint
npm run build
git diff --check
```

Expected: tests PASS, lint no warnings/errors, build completes, diff check no output.

- [ ] **Step 8: Commit the overview refresh**

```bash
git add src/components/family/family-overview-page.tsx src/components/family/family-mental-accounts-panel.tsx src/app/globals.css
git commit -m "feat(family): 优化家庭财务总览页面"
```

---

### Task 3: Family Ledger Page

**Files:**
- Modify: `src/components/family/family-ledger-page.tsx`
- Modify: `src/components/family/family-asset-history-line.tsx`
- Modify: `src/components/family/family-asset-structure-pie.tsx`
- Modify: `src/app/globals.css`
- Test: `__tests__/family-finance/aggregates.test.ts`
- Test: `__tests__/family-finance/history.test.ts`

**Interfaces:**
- Consumes: existing `computeLedgerTotals`, `computeFourPotShares`, `buildFamilyAssetHistory`, tables, modal handlers, pie and line components
- Produces: `.family-finance-page.family-ledger-page` scoped ledger markup
- Does not consume: `FamilyFinanceMetricCard`

- [ ] **Step 1: Run ledger business regression tests before the UI change**

Run:

```bash
npm test -- --runInBand __tests__/family-finance/aggregates.test.ts __tests__/family-finance/history.test.ts
```

Expected: both suites PASS.

- [ ] **Step 2: Replace the Ledger page shell and remove the duplicate summary**

Set the page root to `className="family-finance-page family-ledger-page"` and replace the current leading title block with:

```tsx
<header className="family-finance-header">
  <div>
    <div className="family-finance-eyebrow">资产记账</div>
    <h1>家庭资产记账</h1>
    <p>维护成员资产和家庭负债，保存后会同步更新家庭财务总览。</p>
  </div>
  <Button
    type="primary"
    size="large"
    className="family-finance-primary-action"
    onClick={openCreate}
  >
    + 添加资产/负债
  </Button>
</header>
```

Delete the old paragraph containing:

```tsx
总资产 {formatCny(totals.totalAssets)}
总负债 {formatCny(totals.totalLiabilities)}
净资产 {formatCny(totals.netWorth)}
```

Do not render any replacement KPI or totals summary in Ledger.

- [ ] **Step 3: Reframe structure and ledger item sections**

- Use two `section.family-finance-section-card` containers.
- Keep asset structure on the left and item tables on the right at desktop.
- Move the only “添加资产/负债” trigger to the page header and remove the old dashed button.
- Keep asset and liability tables simultaneously visible.
- Add `scroll={{ x: 'max-content' }}` to both tables.
- Preserve `buildColumns`, explicit edit/delete actions, pagination and empty text.

- [ ] **Step 4: Normalize chart responsiveness**

In `FamilyAssetStructurePie`, add a stable class and responsive direction:

```tsx
<div className="family-asset-structure-chart flex w-full flex-col items-center justify-center gap-5 sm:flex-row">
```

Do not change pie data, domain, tooltip or ratios.

- [ ] **Step 5: Reframe member history cards**

In `FamilyAssetHistoryLine`, replace the generic outer card classes with:

```tsx
<div className="family-asset-history-card">
```

Add all visual styling under `.family-ledger-page .family-asset-history-card`; preserve title, latest amount, empty state and chart config.

- [ ] **Step 6: Verify Ledger hard constraints in source**

Run:

```bash
rg -n "总资产|总负债|净资产|FamilyFinanceMetricCard" src/components/family/family-ledger-page.tsx
```

Expected: no output. The variables `totals` remain valid only because `totalAssets` is still passed to `FamilyAssetStructurePie`; no totals text or KPI component may appear.

- [ ] **Step 7: Verify Ledger tests, lint, and build**

Run:

```bash
npm test -- --runInBand __tests__/family-finance/aggregates.test.ts __tests__/family-finance/history.test.ts
npm run lint
npm run build
git diff --check
```

Expected: tests PASS, lint no warnings/errors, build completes, diff check no output.

- [ ] **Step 8: Commit the Ledger refresh**

```bash
git add src/components/family/family-ledger-page.tsx src/components/family/family-asset-history-line.tsx src/components/family/family-asset-structure-pie.tsx src/app/globals.css
git commit -m "feat(family): 优化家庭资产记账页面"
```

---

### Task 4: Full Regression and Scope Audit

**Files:**
- Verify: `src/components/home/home-tool-card.tsx`
- Verify: `src/components/home/home-tool-grid.tsx`
- Verify: `src/components/family/family-policies-page.tsx`
- Verify: all files changed by Tasks 1–3

**Interfaces:**
- Consumes: completed family overview and ledger UI
- Produces: verified change set ready for independent code review

- [ ] **Step 1: Run the complete family finance test suite**

Run:

```bash
npm test -- --runInBand __tests__/family-finance
```

Expected: all family-finance suites PASS.

- [ ] **Step 2: Run final static verification**

Run:

```bash
npm run lint
npm run build
git diff --check
```

Expected: lint no warnings/errors, production build succeeds, diff check no output.

- [ ] **Step 3: Audit selector and page boundaries**

Run:

```bash
rg -n "^\\.ant-(card|table|btn)|^\\.family-" src/app/globals.css
git diff --exit-code -- src/components/home/home-tool-card.tsx src/components/home/home-tool-grid.tsx src/components/family/family-policies-page.tsx
```

Expected:

- no newly added unscoped Ant Design selectors
- no diff in other homepage cards
- no diff in the independent policies page

- [ ] **Step 4: Request independent code review**

Reviewer must check:

- Ledger has no totals summary or KPI
- overview KPI semantics and heading hierarchy
- CSS scope cannot affect `/view/family/policies` or other homepage cards
- responsive table behavior and mobile CTA
- no data, auth, Repository, chart or CRUD changes

- [ ] **Step 5: Commit review fixes if any**

```bash
git add src/app/globals.css src/components/family/family-finance-metric-card.tsx src/components/family/family-overview-page.tsx src/components/family/family-mental-accounts-panel.tsx src/components/family/family-ledger-page.tsx src/components/family/family-asset-history-line.tsx src/components/family/family-asset-structure-pie.tsx __tests__/family-finance/metric-card.test.ts
git commit -m "fix(family): 修正家庭财务页面视觉回归"
```

Skip this commit only when the reviewer reports no findings.
