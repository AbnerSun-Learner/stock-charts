'use client';

import { AuthGate } from '@/components/auth/auth-gate';
import { FamilyLedgerPage } from '@/components/family/family-ledger-page';

/**
 * 家庭资产记账路由页。
 */
export default function FamilyLedgerRoutePage() {
  return (
    <AuthGate redirectPath="/view/family/ledger">
      <FamilyLedgerPage />
    </AuthGate>
  );
}
