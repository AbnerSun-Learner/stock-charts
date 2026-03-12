/**
 * 测试 Sunburst 配置 JSON 解析：大小限制、格式校验
 */
import { parseConfigJson } from '@/app/view/sunburst/parse-config-json';

const validJson = JSON.stringify({
  name: '资产配置',
  date: '2024-01-01',
  children: [{ name: 'A股', percentage: '50%', children: [] }],
});

describe('parseConfigJson', () => {
  it('接受合法 JSON 并返回 body', () => {
    const result = parseConfigJson(validJson);
    expect(result).toEqual({
      ok: true,
      body: {
        name: '资产配置',
        date: '2024-01-01',
        children: [{ name: 'A股', percentage: '50%', children: [] }],
      },
    });
  });

  it('拒绝缺少 children 的 JSON', () => {
    const result = parseConfigJson(JSON.stringify({ name: 'x' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('children');
  });

  it('拒绝无效 JSON 字符串', () => {
    const result = parseConfigJson('not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeDefined();
  });

  it('拒绝超过大小限制的 JSON', () => {
    const big = 'x'.repeat(2 * 1024 * 1024 + 1);
    const result = parseConfigJson(big);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('过大');
  });

  it('接受恰好在限制内的 JSON', () => {
    const atLimit = '{"children":[]}'.padEnd(2 * 1024 * 1024, ' ');
    const result = parseConfigJson(atLimit);
    expect(result.ok).toBe(true);
  });
});
