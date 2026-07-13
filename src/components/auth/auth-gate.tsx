'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { Alert, Button, Card, Space, Typography } from 'antd';
import { Github } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { tryGetSupabasePublicConfig } from '@/lib/supabase/env';
import {
  formatAuthUserLabel,
  getCurrentUser,
  signInWithGitHub,
  signOut,
} from '@/lib/supabase/auth';
import { AUTH_DISABLED } from '@/lib/supabase/auth-flags';

export interface AuthGateProps {
  children: React.ReactNode;
  /** 登录成功后可选回调 */
  onAuthenticated?: (user: User) => void;
}

type GateStatus = 'loading' | 'guest' | 'authenticated' | 'misconfigured';

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
  const [status, setStatus] = useState<GateStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`;
  }, []);

  const refreshUser = useCallback(
    async (activeClient: SupabaseClient) => {
      const timeoutMs = 8_000;
      const result = await Promise.race([
        getCurrentUser(activeClient),
        new Promise<Awaited<ReturnType<typeof getCurrentUser>>>(resolve => {
          setTimeout(
            () =>
              resolve({
                ok: false,
                error: '会话检查超时，请重试登录',
                code: 'timeout',
              }),
            timeoutMs
          );
        }),
      ]);
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
    },
    [onAuthenticated]
  );

  useEffect(() => {
    if (!tryGetSupabasePublicConfig()) {
      setConfigError(
        '缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY，请参考 .env.local.example'
      );
      setStatus('misconfigured');
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      const activeClient = createSupabaseBrowserClient();
      setClient(activeClient);
      void refreshUser(activeClient);
      const { data } = activeClient.auth.onAuthStateChange(() => {
        void refreshUser(activeClient);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch (error) {
      setConfigError(
        error instanceof Error ? error.message : 'Supabase 客户端初始化失败'
      );
      setStatus('misconfigured');
    }

    return () => {
      unsubscribe?.();
    };
  }, [refreshUser]);

  const onGitHubSignIn = async () => {
    if (!client) {
      return;
    }
    setSigningIn(true);
    setFeedback(null);
    const result = await signInWithGitHub(client, redirectTo);
    if (!result.ok) {
      setSigningIn(false);
      setFeedback({ type: 'error', text: result.error });
      return;
    }
    window.location.assign(result.value.url);
  };

  const onSignOut = async () => {
    if (!client) {
      return;
    }
    await signOut(client);
    setFeedback(null);
    await refreshUser(client);
  };

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
          description={configError}
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
              使用 GitHub 账号登录。请先在 Supabase 启用 GitHub Provider，并将回调
              URL 加入 Redirect allow list。
            </Typography.Paragraph>
            <Button
              type="primary"
              size="large"
              block
              loading={signingIn}
              icon={<Github size={18} />}
              onClick={onGitHubSignIn}
            >
              使用 GitHub 登录
            </Button>
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
          已登录：{user ? formatAuthUserLabel(user) : ''}
        </Typography.Text>
        <Button size="small" onClick={onSignOut}>
          退出登录
        </Button>
      </div>
      {children}
    </div>
  );
}
