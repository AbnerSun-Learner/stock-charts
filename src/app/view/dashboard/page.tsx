'use client';

import { AuthGate } from '@/components/auth/auth-gate';
import { DashboardWorkbench } from '@/components/investment/dashboard-workbench';

/**
 * 组合 Dashboard 页面：需 Magic Link 登录。
 */
export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardWorkbench />
    </AuthGate>
  );
}
