'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  message,
} from 'antd';
import type { Currency, PortfolioSettings } from '@/types/investment';
import type { InvestmentRepository } from '@/lib/supabase/investment-repository';

export interface PortfolioSettingsFormProps {
  settings: PortfolioSettings | null;
  repository: InvestmentRepository;
  onSaved: () => Promise<void>;
}

/**
 * 基础币种、基准、再平衡阈值与现金目标权重。
 */
export function PortfolioSettingsForm({
  settings,
  repository,
  onSaved,
}: PortfolioSettingsFormProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    form.setFieldsValue({
      baseCurrency: settings?.baseCurrency ?? 'CNY',
      benchmarkId: settings?.benchmarkId,
      relativeDriftThreshold: settings?.relativeDriftThreshold ?? 0.2,
      absoluteDriftThreshold: settings?.absoluteDriftThreshold ?? 0.05,
      reviewCadenceDays: settings?.reviewCadenceDays ?? 90,
      cashTargetWeight: settings?.cashTargetWeight ?? 0,
    });
  }, [settings, form]);

  const onFinish = async (values: {
    baseCurrency: Currency;
    benchmarkId?: string;
    relativeDriftThreshold: number;
    absoluteDriftThreshold: number;
    reviewCadenceDays: number;
    cashTargetWeight: number;
  }) => {
    setSaving(true);
    setNotice(null);
    const result = await repository.upsertPortfolioSettings({
      id: settings?.id,
      baseCurrency: values.baseCurrency,
      benchmarkId: values.benchmarkId?.trim() || undefined,
      relativeDriftThreshold: values.relativeDriftThreshold,
      absoluteDriftThreshold: values.absoluteDriftThreshold,
      reviewCadenceDays: values.reviewCadenceDays,
      cashTargetWeight: values.cashTargetWeight,
      cashBaselineDate: settings?.cashBaselineDate,
    });
    setSaving(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    if (values.cashTargetWeight > 0 && result.value.cashTargetWeight === 0) {
      setNotice(
        '组合设置已保存；现金目标权重列尚未在库中落地（§4.5），读回为 0。'
      );
    } else {
      message.success('组合设置已保存');
    }
    await onSaved();
  };

  return (
    <Card title="组合设置">
      {notice ? (
        <Alert className="mb-4" type="info" showIcon message={notice} />
      ) : null}
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="baseCurrency"
          label="基础币种"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: 'CNY', label: 'CNY' },
              { value: 'HKD', label: 'HKD' },
              { value: 'USD', label: 'USD' },
            ]}
          />
        </Form.Item>
        <Form.Item name="benchmarkId" label="组合基准代码（可选）">
          <Input placeholder="如 000300.SH" />
        </Form.Item>
        <Form.Item
          name="cashTargetWeight"
          label="现金目标权重（0–1）"
          rules={[{ required: true }]}
        >
          <InputNumber min={0} max={1} step={0.01} className="w-full" />
        </Form.Item>
        <Form.Item
          name="absoluteDriftThreshold"
          label="绝对偏离阈值"
          rules={[{ required: true }]}
        >
          <InputNumber min={0.001} max={1} step={0.01} className="w-full" />
        </Form.Item>
        <Form.Item
          name="relativeDriftThreshold"
          label="相对偏离阈值"
          rules={[{ required: true }]}
        >
          <InputNumber min={0.001} max={5} step={0.01} className="w-full" />
        </Form.Item>
        <Form.Item
          name="reviewCadenceDays"
          label="复盘周期（天）"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={365} className="w-full" />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={saving}>
            保存设置
          </Button>
        </Space>
      </Form>
    </Card>
  );
}
