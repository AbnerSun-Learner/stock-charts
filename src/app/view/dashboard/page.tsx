'use client';

import { Alert } from 'antd';
import { AuthGate } from '@/components/auth/auth-gate';
import { DashboardWorkbench } from '@/components/investment/dashboard-workbench';
import { AUTH_DISABLED } from '@/lib/supabase/auth-flags';

/**
 * 组合 Dashboard 页面：经 AuthGate（GitHub OAuth）保护。
 */
export default function DashboardPage() {
  return (
    <div className="space-y-3">
      {AUTH_DISABLED ? (
        <Alert
          type="warning"
          showIcon
          message="登录与鉴权已临时关闭（功能审阅）"
          description="将 src/lib/supabase/auth-flags.ts 中 AUTH_DISABLED 改为 false 以恢复 GitHub 登录。"
        />
      ) : null}
      <AuthGate>
        <DashboardWorkbench />
      </AuthGate>
    </div>
  );
}
