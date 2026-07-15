'use client';

import { Alert, Button, Modal, Space, Typography } from 'antd';
import { Github } from 'lucide-react';
import { useAuth } from './auth-provider';

type AuthModalProps = {
  open: boolean;
  nextPath?: string;
  closable?: boolean;
  onClose: () => void;
};

export function AuthModal({
  open,
  nextPath,
  closable = true,
  onClose,
}: AuthModalProps) {
  const {
    configError,
    feedback,
    signingIn,
    startGitHubSignIn,
    status,
  } = useAuth();
  const disabled = status === 'misconfigured' || status === 'loading';

  return (
    <Modal
      open={open}
      title="登录投资驾驶舱"
      centered
      footer={null}
      closable={closable}
      maskClosable={closable}
      onCancel={onClose}
      destroyOnHidden
    >
      <Space direction="vertical" size="middle" className="w-full">
        <Typography.Paragraph type="secondary">
          使用 GitHub 账号登录后可查看和维护资产配置、持仓与再平衡计划。
        </Typography.Paragraph>
        {status === 'loading' ? (
          <Alert type="info" showIcon message="正在恢复登录会话…" />
        ) : null}
        {configError ? (
          <Alert
            type="error"
            showIcon
            message="Supabase 未配置"
            description={configError}
          />
        ) : null}
        <Button
          type="primary"
          size="large"
          block
          disabled={disabled}
          loading={signingIn}
          icon={<Github size={18} />}
          onClick={() => void startGitHubSignIn(nextPath)}
        >
          使用 GitHub 登录
        </Button>
        {feedback ? (
          <Alert type={feedback.type} showIcon message={feedback.text} />
        ) : null}
      </Space>
    </Modal>
  );
}
