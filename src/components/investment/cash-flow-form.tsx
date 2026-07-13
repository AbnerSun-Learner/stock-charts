'use client';

import { useState } from 'react';
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
import type { CashFlowType, Currency } from '@/types/investment';
import type { InvestmentRepository } from '@/lib/supabase/investment-repository';

export interface CashFlowFormProps {
  repository: InvestmentRepository;
  onSaved: () => Promise<void>;
}

/**
 * 手工录入外部出入金、分红、费用、换汇（双腿）。
 */
export function CashFlowForm({ repository, onSaved }: CashFlowFormProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const type = Form.useWatch('type', form) as CashFlowType | undefined;

  const onFinish = async (values: {
    flowDate: string;
    type: CashFlowType;
    amount: number;
    currency: Currency;
    fxRateToBase: number;
    instrumentId?: string;
    counterCurrency?: Currency;
    counterAmount?: number;
    note?: string;
  }) => {
    setSaving(true);
    const amountBase = values.amount * values.fxRateToBase;
    const result = await repository.insertCashFlow({
      flowDate: values.flowDate,
      type: values.type,
      amount: values.amount,
      currency: values.currency,
      fxRateToBase: values.fxRateToBase,
      amountBase,
      instrumentId: values.instrumentId?.trim() || undefined,
      counterCurrency: values.counterCurrency,
      counterAmount: values.counterAmount,
      note: values.note,
    });
    setSaving(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success('现金流已录入');
    form.resetFields(['amount', 'note', 'counterAmount', 'instrumentId']);
    await onSaved();
  };

  return (
    <Card title="录入现金流">
      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="金额一律非负；方向由类型决定。deposit/withdrawal 计入 XIRR；dividend/fee 等为内部事件。"
      />
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          flowDate: new Date().toISOString().slice(0, 10),
          type: 'deposit',
          currency: 'CNY',
          fxRateToBase: 1,
        }}
        onFinish={onFinish}
      >
        <Form.Item
          name="flowDate"
          label="日期"
          rules={[{ required: true, message: '请填写日期' }]}
        >
          <Input type="date" />
        </Form.Item>
        <Form.Item name="type" label="类型" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'deposit', label: '入金 deposit' },
              { value: 'withdrawal', label: '出金 withdrawal' },
              { value: 'dividend', label: '分红 dividend' },
              { value: 'fee', label: '费用 fee' },
              { value: 'tax', label: '税费 tax' },
              { value: 'interest', label: '利息 interest' },
              { value: 'fx_exchange', label: '换汇 fx_exchange' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="amount"
          label={type === 'fx_exchange' ? '入账金额' : '金额'}
          rules={[{ required: true }]}
        >
          <InputNumber min={0.00000001} className="w-full" />
        </Form.Item>
        <Form.Item name="currency" label="币种" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'CNY', label: 'CNY' },
              { value: 'HKD', label: 'HKD' },
              { value: 'USD', label: 'USD' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="fxRateToBase"
          label="兑基础币种汇率"
          rules={[{ required: true }]}
        >
          <InputNumber min={0.00000001} className="w-full" />
        </Form.Item>
        {type === 'fx_exchange' ? (
          <>
            <Form.Item
              name="counterCurrency"
              label="出账币种"
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
            <Form.Item
              name="counterAmount"
              label="出账金额"
              rules={[{ required: true }]}
            >
              <InputNumber min={0.00000001} className="w-full" />
            </Form.Item>
          </>
        ) : null}
        <Form.Item name="instrumentId" label="关联标的（可选，规范代码）">
          <Input placeholder="510300.SH" />
        </Form.Item>
        <Form.Item name="note" label="备注">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={saving}>
            提交
          </Button>
        </Space>
      </Form>
    </Card>
  );
}
