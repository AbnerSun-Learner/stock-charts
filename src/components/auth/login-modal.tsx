'use client';

import { Modal, Button, Typography, App } from 'antd';
import { GithubOutlined } from '@ant-design/icons';
import { signInWithGitHub } from '@/lib/supabase/auth';
import { useState } from 'react';

const { Paragraph } = Typography;

export interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  /** 登录成功后希望回到的路径 */
  redirectTo?: string;
}

/**
 * 家庭财务登录弹窗（GitHub OAuth）。
 */
export function LoginModal({ open, onClose, redirectTo }: LoginModalProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGitHub(redirectTo);
      if (error) {
        message.error(error.message);
        setLoading(false);
      }
      // 成功时会整页跳转，无需关 Modal
    } catch (e) {
      message.error(e instanceof Error ? e.message : '登录失败');
      setLoading(false);
    }
  };

  return (
    <Modal
      title="登录以使用家庭财务"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Paragraph type="secondary" className="mb-4">
        本工具仅限家庭账号使用。请使用已授权的 GitHub 账号登录。
      </Paragraph>
      <Button
        type="primary"
        block
        size="large"
        icon={<GithubOutlined />}
        loading={loading}
        onClick={() => void handleLogin()}
      >
        使用 GitHub 登录
      </Button>
    </Modal>
  );
}
