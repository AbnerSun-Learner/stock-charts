'use client';

import { AuthGate } from '@/components/auth/auth-gate';
import { FamilyPoliciesPage } from '@/components/family/family-policies-page';

/**
 * 保单管理路由页。
 */
export default function FamilyPoliciesRoutePage() {
  return (
    <AuthGate redirectPath="/view/family/policies">
      <FamilyPoliciesPage />
    </AuthGate>
  );
}
