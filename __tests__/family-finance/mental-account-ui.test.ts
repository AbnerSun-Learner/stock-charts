import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '../..');

describe('mental account priority UI contracts', () => {
  it('表单与 Repository 包含优先级与开始日期字段', () => {
    const panel = readFileSync(
      join(root, 'src/components/family/family-mental-accounts-panel.tsx'),
      'utf8'
    );
    const repo = readFileSync(
      join(root, 'src/lib/supabase/family-finance-repository.ts'),
      'utf8'
    );
    const chart = readFileSync(
      join(root, 'src/components/family/family-mental-goals-bar-chart.tsx'),
      'utf8'
    );

    expect(panel).toContain("name=\"priority\"");
    expect(panel).toContain("name=\"startDate\"");
    expect(panel).toContain('FamilyMentalGoalsBarChart');
    expect(panel).toContain('groupMentalAccountsByPriority');
    expect(panel).toContain('family-mental-accounts-card');
    expect(panel).toContain('family-mental-goals-card');
    expect(panel).toContain('lg={16}');
    expect(panel).toContain('lg={8}');

    expect(repo).toContain('priority:');
    expect(repo).toContain('start_date');
    expect(repo).toContain('startDate:');
    expect(repo).toContain("order('priority'");
    expect(repo).toContain("order('target_date'");

    expect(chart).toContain('目标合计');
    expect(chart).toContain('已达成');
  });

  it('水波图展示关联账户名称', () => {
    const liquid = readFileSync(
      join(root, 'src/components/family/family-mental-account-liquid.tsx'),
      'utf8'
    );
    const panel = readFileSync(
      join(root, 'src/components/family/family-mental-accounts-panel.tsx'),
      'utf8'
    );

    expect(liquid).toContain('linkedAccountNames');
    expect(liquid).toContain('关联账户');
    expect(panel).toContain('linkedAccountNames={linkedAccountNames}');
  });

  it('总览心理账户整行且保单下移全宽', () => {
    const overview = readFileSync(
      join(root, 'src/components/family/family-overview-page.tsx'),
      'utf8'
    );
    expect(overview).toContain('FamilyMentalAccountsPanel');
    expect(overview).toContain('family-overview-mental-panel');
    expect(overview).toMatch(/family-overview-panels-row[\s\S]*Col xs=\{24\}[\s\S]*FamilyMentalAccountsPanel/);
    expect(overview).toMatch(/FamilyMentalAccountsPanel[\s\S]*Col xs=\{24\}[\s\S]*FamilyPoliciesPage/);
  });
});