'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from '@/lib/supabase/env';

let browserClient: SupabaseClient | null = null;

/**
 * 浏览器端单例客户端（仅公开 key，不做 service_role）。
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }
  const { url, anonKey } = getSupabasePublicConfig();
  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}
