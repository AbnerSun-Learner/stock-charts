'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Alert, Button, Card, Space, Typography } from 'antd';
import { AUTH_DISABLED } from '@/lib/supabase/auth-flags';
import { AuthModal } from './auth-modal';
import { useAuth } from './auth-provider';

export interface AuthGateProps {
  children: React.ReactNode;
  /** 登录成功后可选回调 */
  onAuthenticated?: (user: User) => void;
}

/**
 * 未登录展示 GitHub OAuth 入口；已登录渲染子节点。
 * 审阅期：`AUTH_DISABLED` 为 true 时直接放行（不跑登录态）。
 */
export function AuthGate({ children, onAuthenticated }: AuthGateProps) {
  if (AUTH_DISABLED) {
    return <>{children}</>;
  }
  return (
    <AuthGateEnabled onAuthenticated={onAuthenticated}>
      {children}
    </AuthGateEnabled>
  );
}

function AuthGateEnabled({ children, onAuthenticated }: AuthGateProps) {
  const { status, user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(status === 'guest');

  useEffect(() => {
    if (status === 'authenticated' && user) {
      onAuthenticated?.(user);
    }
  }, [onAuthenticated, status, user]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Typography.Text type="secondary">正在恢复登录会话…</Typography.Text>
      </div>
    );
  }

  if (status === 'misconfigured') {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-4 py-8">
        <Alert
          type="error"
          showIcon
          message="Supabase 未配置"
          description="缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY，请参考 .env.local.example"
        />
      </div>
    );
  }

  if (status === 'guest') {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-4 py-8">
        <Card title="登录投资驾驶舱">
          <Space direction="vertical" size="middle" className="w-full">
            <Typography.Paragraph type="secondary">
              使用 GitHub 账号登录后可进入资产配置页。请确认 Supabase 已启用
              GitHub Provider，并将回调 URL 加入 Redirect allow list。
            </Typography.Paragraph>
            <Button type="primary" size="large" block onClick={() => setLoginOpen(true)}>
              登录
            </Button>
          </Space>
        </Card>
        <AuthModal
          open={loginOpen}
          nextPath="/view/dashboard"
          onClose={() => setLoginOpen(false)}
        />
      </div>
    );
  }

  return <>{children}</>;
}
