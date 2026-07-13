/**
 * Supabase 公开环境变量读取与 URL 规范化。
 * 表契约权威 DDL 在 scheduled-tasks：`20260710_cockpit_ledger_and_fx_rates.sql`；
 * §4.5 补强（import_batches / replace_target_allocation_config 等）未落地前，相关 RPC 写入会返回 rpc_unavailable。
 */

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigError';
  }
}

/**
 * 去掉误粘贴的 `/rest/v1` 后缀，得到项目根 URL。
 */
export function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.replace(/\/rest\/v1$/i, '');
}

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

/**
 * 读取浏览器/服务端可用的公开配置；缺失时抛明确错误。
 */
export function getSupabasePublicConfig(): SupabasePublicConfig {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!rawUrl?.trim()) {
    throw new SupabaseConfigError(
      '缺少 NEXT_PUBLIC_SUPABASE_URL，请参考 .env.local.example 配置'
    );
  }
  if (!anonKey?.trim()) {
    throw new SupabaseConfigError(
      '缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY（或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY）'
    );
  }

  return {
    url: normalizeSupabaseUrl(rawUrl),
    anonKey: anonKey.trim(),
  };
}
