import { formatCny } from '@/lib/family-finance/format';

describe('formatCny', () => {
  it('格式化正数人民币', () => {
    expect(formatCny(1234.5)).toBe('¥1,234.50');
  });

  it('负数在负号与金额符号之间留空', () => {
    expect(formatCny(-123456)).toBe('- ¥123,456.00');
  });

  it('小额负数同样留空且保留小数', () => {
    expect(formatCny(-0.01)).toBe('- ¥0.01');
  });

  it('零金额保持正数样式', () => {
    expect(formatCny(0)).toBe('¥0.00');
  });
});
