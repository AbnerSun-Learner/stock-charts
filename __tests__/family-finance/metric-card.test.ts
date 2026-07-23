/** @jest-environment node */

import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
    expect(html).toContain('family-finance-monetary-value');
  });

  it('renders negative values with the negative tone and formatted amount', () => {
    const html = renderToStaticMarkup(
      createElement(FamilyFinanceMetricCard, {
        label: '净资产',
        value: -123456,
        tone: 'negative',
        loading: false,
        hint: '总资产扣除总负债',
      })
    );

    expect(html).toContain('family-finance-metric--negative');
    expect(html).toContain('-¥123,456.00');
  });

  it('renders the loading skeleton without the amount', () => {
    const html = renderToStaticMarkup(
      createElement(FamilyFinanceMetricCard, {
        label: '总资产',
        value: 123456,
        tone: 'primary',
        loading: true,
        hint: '家庭当前资产合计',
      })
    );

    expect(html).toContain('ant-skeleton');
    expect(html).not.toContain('¥123,456.00');
  });
});

describe('FamilyLedgerPage source contract', () => {
  it('keeps KPI summaries out of the ledger and preserves both responsive tables', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/family/family-ledger-page.tsx'),
      'utf8'
    );

    expect(source).not.toContain('FamilyFinanceMetricCard');
    expect(source).not.toContain('Statistic');
    expect(source).not.toContain('总资产');
    expect(source).not.toContain('总负债');
    expect(source).not.toContain('净资产');
    expect(source.match(/scroll=\{\{ x: 'max-content' \}\}/g)).toHaveLength(2);
  });
});
