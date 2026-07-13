'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert, Button, Card, Space, Typography } from 'antd';
import { Github } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { signInWithGitHub } from '@/lib/supabase/auth';
import { AUTH_DISABLED } from '@/lib/supabase/auth-flags';

function AuthErrorContent() {
  if (AUTH_DISABLED) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-10">
        <Alert
          type="info"
          showIcon
          message="登录已临时关闭"
          description={
            <span>
              功能审阅期不使用登录。请前往{' '}
              <Link href="/view/dashboard">组合看板</Link>。
            </span>
          }
        />
      </main>
    );
  }

  return <AuthErrorEnabled />;
}

function AuthErrorEnabled() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') ?? '';
  const message =
    searchParams.get('message') ?? 'GitHub 授权失败或已取消，请重试。';
  const [status, setStatus] = useState<'idle' | 'redirecting' | 'error'>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent('/view/dashboard')}`;
  }, []);

  const onRetry = async () => {
    setStatus('redirecting');
    setErrorText(null);
    try {
      const client = createSupabaseBrowserClient();
      const result = await signInWithGitHub(client, redirectTo);
      if (!result.ok) {
        setStatus('error');
        setErrorText(result.error);
        return;
      }
      window.location.assign(result.value.url);
    } catch (error) {
      setStatus('error');
      setErrorText(error instanceof Error ? error.message : '登录失败');
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-10">
      <Card title="登录未能完成">
        <Space direction="vertical" size="middle" className="w-full">
          <Alert
            type="warning"
            showIcon
            message={message}
            description={code ? `错误码：${code}` : undefined}
          />
          <Typography.Paragraph type="secondary">
            可重新发起 GitHub 授权；请确认 Redirect URL 已包含本站
            `/auth/callback`。
          </Typography.Paragraph>
          <Button
            type="primary"
            block
            loading={status === 'redirecting'}
            icon={<Github size={18} />}
            onClick={onRetry}
          >
            重新使用 GitHub 登录
          </Button>
          {status === 'error' && errorText ? (
            <Alert type="error" showIcon message={errorText} />
          ) : null}
        </Space>
      </Card>
    </main>
  );
}

/**
 * OAuth 失败可恢复页。
 */
export default function AuthErrorPage() {
  return (
    <Suspense fallback={<main className="p-8">加载中…</main>}>
      <AuthErrorContent />
    </Suspense>
  );
}
