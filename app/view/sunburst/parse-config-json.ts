/**
 * 旭日图配置 JSON 解析：格式与大小校验，供页面与单测共用。
 */

export interface SunburstNode {
  name: string;
  shares?: number;
  percentage?: string;
  children?: SunburstNode[];
}

export type ConfigBody = { name?: string; date?: string; children?: SunburstNode[] };

const MAX_JSON_LENGTH = 2 * 1024 * 1024; // 2MB

/**
 * 解析旭日图配置 JSON，包含格式与大小校验。
 * 返回解析成功的配置体或错误信息。
 */
export function parseConfigJson(
  raw: string
): { ok: true; body: ConfigBody } | { ok: false; error: string } {
  if (raw.length > MAX_JSON_LENGTH) {
    return { ok: false, error: `JSON 过大，请限制在 ${MAX_JSON_LENGTH / 1024 / 1024}MB 以内` };
  }
  try {
    const json = JSON.parse(raw) as unknown;
    if (!json || typeof json !== 'object') return { ok: false, error: '无效的 JSON' };
    const body = json as Record<string, unknown>;
    if (!Array.isArray(body.children))
      return { ok: false, error: '缺少 children 数组，格式需与 position_distribution.json 一致' };
    return {
      ok: true,
      body: {
        name: String(body.name ?? ''),
        date: body.date != null ? String(body.date) : undefined,
        children: body.children as SunburstNode[],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '解析失败' };
  }
}
