'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { sendMagicLink } from '@/lib/supabase/auth';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') ?? '';
  const message =
    searchParams.get('message') ?? '登录链接无效或已过期，请重新发送。';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const [errorText, setErrorText] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/auth/callback`;
  }, []);

  const onResend = async () => {
    setStatus('sending');
    setErrorText(null);
    try {
      const client = createSupabaseBrowserClient();
      const result = await sendMagicLink(client, email, redirectTo);
      if (!result.ok) {
        setStatus('error');
        setErrorText(result.error);
        return;
      }
      setStatus('sent');
    } catch (error) {
      setStatus('error');
      setErrorText(error instanceof Error ? error.message : '发送失败');
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-10">
      <Card title="登录链接无法使用">
        <Space direction="vertical" size="middle" className="w-full">
          <Alert
            type="warning"
            showIcon
            message={message}
            description={code ? `错误码：${code}` : undefined}
          />
          <Typography.Paragraph type="secondary">
            链接过期或失效后可重新发送 Magic Link，无需刷新到白屏。
          </Typography.Paragraph>
          <Form layout="vertical" onFinish={onResend}>
            <Form.Item
              label="邮箱"
              required
              rules={[{ required: true, message: '请输入邮箱' }]}
            >
              <Input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={status === 'sending'}
              block
            >
              重新发送 Magic Link
            </Button>
          </Form>
          {status === 'sent' ? (
            <Alert type="success" showIcon message="邮件已发送，请查收邮箱" />
          ) : null}
          {status === 'error' && errorText ? (
            <Alert type="error" showIcon message={errorText} />
          ) : null}
        </Space>
      </Card>
    </main>
  );
}

/**
 * Magic Link 失败可恢复页。
 */
export default function AuthErrorPage() {
  return (
    <Suspense fallback={<main className="p-8">加载中…</main>}>
      <AuthErrorContent />
    </Suspense>
  );
}
