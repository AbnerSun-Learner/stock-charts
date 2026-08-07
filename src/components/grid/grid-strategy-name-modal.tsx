'use client';

import { Form, Input, Modal } from 'antd';
import { useEffect, useState } from 'react';

export interface GridStrategyNameModalProps {
  open: boolean;
  mode: 'create' | 'rename';
  initialName?: string;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void>;
}

/**
 * 新建/改名共用的策略名称弹窗。
 */
export function GridStrategyNameModal({
  open,
  mode,
  initialName,
  loading,
  error,
  onCancel,
  onSubmit,
}: GridStrategyNameModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialName ?? '');
    }
  }, [open, initialName]);

  const trimmed = name.trim();
  const invalid = trimmed.length < 1 || trimmed.length > 50;

  const handleOk = async () => {
    if (invalid || loading) return;
    await onSubmit(trimmed);
  };

  return (
    <Modal
      title={mode === 'create' ? '保存策略' : '重命名策略'}
      open={open}
      onCancel={loading ? undefined : onCancel}
      onOk={() => void handleOk()}
      okText={mode === 'create' ? '保存' : '确认'}
      cancelText="取消"
      confirmLoading={loading}
      okButtonProps={{ disabled: invalid || loading }}
      cancelButtonProps={{ disabled: loading }}
      destroyOnClose
      centered
      maskClosable={!loading}
      closable={!loading}
    >
      <Form layout="vertical">
        <Form.Item
          label="策略名称"
          validateStatus={error ? 'error' : undefined}
          help={error ?? '1～50 个字符，同账号下名称不可重复'}
          required
        >
          <Input
            value={name}
            maxLength={50}
            showCount
            placeholder="例如：沪深300低吸"
            disabled={loading}
            onChange={e => setName(e.target.value)}
            onPressEnter={() => void handleOk()}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
