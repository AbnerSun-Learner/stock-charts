'use client';

import { AuthGate } from '@/components/auth/auth-gate';
import { FamilyOverviewPage } from '@/components/family/family-overview-page';

/**
 * 家庭财务总览路由页。
 */
export default function FamilyPage() {
  return (
    <AuthGate redirectPath="/view/family">
      <FamilyOverviewPage />
    </AuthGate>
  );
}
