/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('FamilyLedgerPage amount visibility contract', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/family/family-ledger-page.tsx'),
    'utf8'
  );

  it('标题旁用眼睛图标切换金额显隐，默认隐藏，并用 Provider 包裹', () => {
    expect(source).toContain('EyeFilled');
    expect(source).toContain('EyeInvisibleFilled');
    expect(source).toContain('family-finance-header__title-row');
    expect(source).toContain('FamilyAmountVisibilityProvider');
    expect(source).toContain(
      'const [amountsVisible, setAmountsVisible] = useState(false)'
    );
    expect(source).not.toContain('<Switch');
  });
});
