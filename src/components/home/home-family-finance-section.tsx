'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Col, Row } from 'antd';
import { HomeFamilyFinanceCard } from './home-family-finance-card';
import { LoginModal } from '@/components/auth/login-modal';
import { checkFamilyAccess, signOut } from '@/lib/supabase/auth';

/**
 * 首页「家庭财务」独立分区。
 */
export function HomeFamilyFinanceSection() {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);

  const handleEnter = async () => {
    try {
      const result = await checkFamilyAccess();
      if (result.allowed) {
        router.push('/view/family');
        return;
      }
      if (result.session && !result.allowed) {
        await signOut();
      }
      setLoginOpen(true);
    } catch {
      setLoginOpen(true);
    }
  };

  return (
    <section className="mb-8 sm:mb-10">
      <h2 className="font-[var(--font-display)] text-sm font-semibold tracking-wide text-[var(--text-muted)] uppercase m-0 mb-4">
        家庭财务
      </h2>
      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <HomeFamilyFinanceCard onAction={() => void handleEnter()} />
        </Col>
      </Row>
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        redirectTo="/view/family"
      />
    </section>
  );
}
