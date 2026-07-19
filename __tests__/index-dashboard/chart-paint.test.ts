import {
  createIndustryPieLabel,
  resolveCanvasCssColor,
} from '@/lib/index-dashboard/chart-paint';

describe('resolveCanvasCssColor', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--text-muted');
  });

  test('在传给 Canvas 前把 CSS 变量解析为实际颜色', () => {
    document.documentElement.style.setProperty('--text-muted', '#64748b');

    expect(resolveCanvasCssColor('--text-muted', '#6b7280')).toBe('#64748b');
  });

  test('CSS 变量没有值时使用回退色', () => {
    expect(resolveCanvasCssColor('--text-muted', '#6b7280')).toBe('#6b7280');
  });
});

describe('createIndustryPieLabel', () => {
  test('窄屏关闭外部标签，避免文字被画布裁剪', () => {
    expect(createIndustryPieLabel(false, '#64748b')).toBe(false);
  });

  test('宽屏使用已解析的颜色展示外部标签', () => {
    const label = createIndustryPieLabel(true, '#64748b');

    expect(label).toMatchObject({
      position: 'outside',
      style: { fontSize: 11, fill: '#64748b' },
    });
  });
});
