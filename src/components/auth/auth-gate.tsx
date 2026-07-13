'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  getCurrentUser,
  sendMagicLink,
  signOut,
} from '@/lib/supabase/auth';

export interface AuthGateProps {
  children: React.ReactNode;
  /** 登录成功后可选回调 */
  onAuthenticated?: (user: User) => void;
}

type GateStatus = 'loading' | 'guest' | 'authenticated';

/**
 * 未登录展示 Magic Link 入口；已登录渲染子节点。
 * Dashboard 等路由在 Phase 2 接入；本组件本身可独立使用。
 */
export function AuthGate({ children, onAuthenticated }: AuthGateProps) {
  const [status, setStatus] = useState<GateStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`;
  }, []);

  const refreshUser = useCallback(async () => {
    const result = await getCurrentUser(client);
    if (!result.ok) {
      setUser(null);
      setStatus('guest');
      return;
    }
    if (result.value) {
      setUser(result.value);
      setStatus('authenticated');
      onAuthenticated?.(result.value);
      return;
    }
    setUser(null);
    setStatus('guest');
  }, [client, onAuthenticated]);

  useEffect(() => {
    void refreshUser();
    const { data } = client.auth.onAuthStateChange(() => {
      void refreshUser();
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [client, refreshUser]);

  const onSend = async () => {
    setSending(true);
    setFeedback(null);
    const result = await sendMagicLink(client, email, redirectTo);
    setSending(false);
    if (!result.ok) {
      setFeedback({ type: 'error', text: result.error });
      return;
    }
    setFeedback({
      type: 'success',
      text: 'Magic Link 已发送，请查收邮箱并点击链接完成登录',
    });
  };

  const onSignOut = async () => {
    await signOut(client);
    setFeedback(null);
    await refreshUser();
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Typography.Text type="secondary">正在恢复登录会话…</Typography.Text>
      </div>
    );
  }

  if (status === 'guest') {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-4 py-8">
        <Card title="登录投资驾驶舱">
          <Space direction="vertical" size="middle" className="w-full">
            <Typography.Paragraph type="secondary">
              使用邮箱 Magic Link 登录。不支持第三方 OAuth（Phase 1）。
            </Typography.Paragraph>
            <Form layout="vertical" onFinish={onSend}>
              <Form.Item label="邮箱" required>
                <Input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={sending} block>
                发送 Magic Link
              </Button>
            </Form>
            {feedback ? (
              <Alert type={feedback.type} showIcon message={feedback.text} />
            ) : null}
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <Typography.Text type="secondary">
          已登录：{user?.email}
        </Typography.Text>
        <Button size="small" onClick={onSignOut}>
          退出登录
        </Button>
      </div>
      {children}
    </div>
  );
}
