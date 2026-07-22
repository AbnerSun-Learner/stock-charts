'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Col, Row } from 'antd';
import { HomeToolCard } from './home-tool-card';
import { LoginModal } from '@/components/auth/login-modal';
import { checkFamilyAccess, signOut } from '@/lib/supabase/auth';

const FAMILY_ICON = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 首页「家庭财务」独立分区（同款卡片样式）。
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
        <Col xs={24} sm={12} lg={6}>
          <HomeToolCard
            title="家庭财务总览"
            description="盘点家庭资产负债与保单覆盖"
            icon={FAMILY_ICON}
            animationDelay="0.08s"
            onAction={() => void handleEnter()}
          />
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
