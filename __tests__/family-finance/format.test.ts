import { formatCompactCny, formatCny, formatDateTime } from '@/lib/family-finance/format';

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

  it('visible:false 时返回固定遮罩', () => {
    expect(formatCny(1234.5, { visible: false })).toBe('****');
    expect(formatCny(-99, { visible: false })).toBe('****');
  });

  it('visible:true 与缺省行为一致', () => {
    expect(formatCny(1234.5, { visible: true })).toBe('¥1,234.50');
  });
});

describe('formatCompactCny', () => {
  it('visible:false 时返回固定遮罩', () => {
    expect(formatCompactCny(1234567, { visible: false })).toBe('****');
  });

  it('缺省时使用紧凑记法', () => {
    expect(formatCompactCny(1234567)).toMatch(/万|百万|千万|亿|1/);
  });
});

describe('formatDateTime', () => {
  it('将 ISO 时间格式化为本地 YYYY-MM-DD HH:mm', () => {
    const label = formatDateTime('2026-07-24T04:30:00.000Z');
    expect(label).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('非法输入原样返回', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });
});
