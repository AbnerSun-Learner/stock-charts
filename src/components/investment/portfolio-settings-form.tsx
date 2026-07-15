'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  InputNumber,
  Select,
  Space,
  message,
} from 'antd';
import type { Currency, PortfolioSettings } from '@/types/investment';
import type { InvestmentRepository } from '@/lib/supabase/investment-repository';
import { HelpTooltip } from '@/components/shared/help-tooltip';

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
  const [benchmarkOptions, setBenchmarkOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loadingBenchmarks, setLoadingBenchmarks] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingBenchmarks(true);

    Promise.all([
      repository.listSharedPoolInstruments(),
      repository.listCustomInstruments(),
    ])
      .then(([sharedResult, customResult]) => {
        if (!mounted) {
          return;
        }
        const instruments = [
          ...(customResult.ok ? customResult.value : []),
          ...(sharedResult.ok ? sharedResult.value : []),
        ];
        const optionsBySymbol = new Map(
          instruments.map(instrument => [instrument.symbol, instrument])
        );
        setBenchmarkOptions(
          Array.from(optionsBySymbol.values())
            .sort((left, right) => left.symbol.localeCompare(right.symbol))
            .map(instrument => ({
              value: instrument.symbol,
              label: `${instrument.symbol} - ${instrument.name}`,
            }))
        );
      })
      .catch(() => {
        if (mounted) {
          setBenchmarkOptions([]);
          message.warning('ETF 基准代码加载失败，请稍后重试');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingBenchmarks(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [repository]);

  useEffect(() => {
    form.setFieldsValue({
      baseCurrency: settings?.baseCurrency ?? 'CNY',
      benchmarkId: settings?.benchmarkId,
      relativeDriftThreshold: settings?.relativeDriftThreshold ?? 0.2,
      absoluteDriftThreshold: settings?.absoluteDriftThreshold ?? 0.05,
      reviewCadenceDays: settings?.reviewCadenceDays ?? 90,
      cashTargetWeight: (settings?.cashTargetWeight ?? 0) * 100,
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
      cashTargetWeight: values.cashTargetWeight / 100,
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

  const benchmarkSelectOptions = useMemo(() => {
    if (
      settings?.benchmarkId &&
      !benchmarkOptions.some(option => option.value === settings.benchmarkId)
    ) {
      return [
        {
          value: settings.benchmarkId,
          label: `${settings.benchmarkId} - 当前配置`,
        },
        ...benchmarkOptions,
      ];
    }
    return benchmarkOptions;
  }, [benchmarkOptions, settings?.benchmarkId]);

  return (
    <Card title="组合设置">
      {notice ? (
        <Alert className="mb-4" type="info" showIcon message={notice} />
      ) : null}
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="baseCurrency"
          label={
            <ConfigLabel
              text="基础币种"
              tooltip="组合统一核算和展示使用的基础货币。"
            />
          }
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
          name="benchmarkId"
          label={
            <ConfigLabel
              text="组合基准代码（可选）"
              tooltip="用于对比组合整体表现的 ETF 基准，选项来自数据库中的 ETF 代码。"
            />
          }
        >
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            loading={loadingBenchmarks}
            placeholder="请选择 ETF 代码"
            options={benchmarkSelectOptions}
            notFoundContent={
              loadingBenchmarks ? '正在加载 ETF 代码' : '暂无 ETF 代码'
            }
          />
        </Form.Item>
        <Form.Item
          name="cashTargetWeight"
          label={
            <ConfigLabel
              text="现金目标权重（%）"
              tooltip="组合希望长期保留的现金比例，参与目标配置合计校验。"
            />
          }
          rules={[{ required: true }]}
        >
          <InputNumber
            min={0}
            max={100}
            step={1}
            suffix="%"
            className="w-full"
          />
        </Form.Item>
        <Form.Item
          name="absoluteDriftThreshold"
          label={
            <ConfigLabel
              text="绝对偏离阈值"
              tooltip="当前权重与目标权重的绝对差值达到该比例时，触发再平衡检查。"
            />
          }
          rules={[{ required: true }]}
        >
          <InputNumber min={0.001} max={1} step={0.01} className="w-full" />
        </Form.Item>
        <Form.Item
          name="relativeDriftThreshold"
          label={
            <ConfigLabel
              text="相对偏离阈值"
              tooltip="当前权重相对目标权重的偏离比例达到该值时，触发再平衡检查。"
            />
          }
          rules={[{ required: true }]}
        >
          <InputNumber min={0.001} max={5} step={0.01} className="w-full" />
        </Form.Item>
        <Form.Item
          name="reviewCadenceDays"
          label={
            <ConfigLabel
              text="复盘周期（天）"
              tooltip="两次定期组合复盘之间的间隔天数。"
            />
          }
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

function ConfigLabel({ text, tooltip }: { text: string; tooltip: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {text}
      <HelpTooltip title={tooltip} placement="topLeft" />
    </span>
  );
}
