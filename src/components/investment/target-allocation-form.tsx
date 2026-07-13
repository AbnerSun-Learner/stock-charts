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
  Table,
  message,
} from 'antd';
import type { AllocationRole, TargetAllocation } from '@/types/investment';
import type { InvestmentRepository } from '@/lib/supabase/investment-repository';
import { validateTargetAllocationWeights } from '@/lib/investment/portfolio';
import { formatPercent } from '@/lib/investment/money';

interface DraftRow {
  key: string;
  instrumentId: string;
  targetWeight: number;
  allocationRole: AllocationRole;
}

export interface TargetAllocationFormProps {
  targets: TargetAllocation[];
  cashTargetWeight: number;
  repository: InvestmentRepository;
  onSaved: () => Promise<void>;
}

/**
 * 维护目标配置：与持仓导入分离；写入仅走 RPC。
 */
export function TargetAllocationForm({
  targets,
  cashTargetWeight,
  repository,
  onSaved,
}: TargetAllocationFormProps) {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [cashWeight, setCashWeight] = useState(cashTargetWeight);
  const [saving, setSaving] = useState(false);
  const [rpcBlocked, setRpcBlocked] = useState(false);

  useEffect(() => {
    setRows(
      targets.map(target => ({
        key: target.id,
        instrumentId: target.instrumentId,
        targetWeight: target.targetWeight,
        allocationRole: target.allocationRole,
      }))
    );
    setCashWeight(cashTargetWeight);
  }, [targets, cashTargetWeight]);

  const validation = validateTargetAllocationWeights(
    rows.map((row, index) => ({
      id: row.key,
      instrumentId: row.instrumentId,
      targetWeight: row.targetWeight,
      allocationRole: row.allocationRole,
      updatedAt: new Date().toISOString(),
    })),
    cashWeight
  );

  const addRow = () => {
    setRows(prev => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        instrumentId: '',
        targetWeight: 0,
        allocationRole: 'core',
      },
    ]);
  };

  const onSave = async () => {
    if (!validation.ok) {
      message.error(`权重校验失败：${validation.errors.join(', ')}`);
      return;
    }
    setSaving(true);
    const result = await repository.replaceTargetAllocationConfig({
      cashTargetWeight: cashWeight,
      allocations: rows.map(row => ({
        instrumentId: row.instrumentId.trim(),
        targetWeight: row.targetWeight,
        allocationRole: row.allocationRole,
      })),
    });
    setSaving(false);
    if (!result.ok) {
      if (result.error === 'rpc_unavailable') {
        setRpcBlocked(true);
      }
      message.error(result.message);
      return;
    }
    setRpcBlocked(false);
    message.success('目标配置已更新');
    await onSaved();
  };

  return (
    <Card
      title="目标配置"
      extra={
        <Space>
          <Button onClick={addRow}>新增标的</Button>
          <Button type="primary" loading={saving} onClick={onSave}>
            保存（RPC）
          </Button>
        </Space>
      }
    >
      {rpcBlocked ? (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message="目标库尚未提供 replace_target_allocation_config（§4.5）。客户端禁止逐行改配置。"
        />
      ) : null}
      <Form layout="inline" className="mb-4">
        <Form.Item label="现金目标权重">
          <InputNumber
            min={0}
            max={1}
            step={0.01}
            value={cashWeight}
            onChange={value => setCashWeight(Number(value ?? 0))}
          />
        </Form.Item>
        <Form.Item label="权重合计">
          <span className="tabular-nums">
            {formatPercent(validation.totalWithCash)}
            {validation.ok ? ' ✓' : '（须 = 100%）'}
          </span>
        </Form.Item>
      </Form>
      <Table
        size="small"
        pagination={false}
        rowKey="key"
        dataSource={rows}
        columns={[
          {
            title: '规范代码',
            dataIndex: 'instrumentId',
            render: (_value, record, index) => (
              <Input
                value={record.instrumentId}
                placeholder="510300.SH"
                onChange={event => {
                  const next = [...rows];
                  next[index] = {
                    ...record,
                    instrumentId: event.target.value,
                  };
                  setRows(next);
                }}
              />
            ),
          },
          {
            title: '目标权重',
            dataIndex: 'targetWeight',
            width: 120,
            render: (_value, record, index) => (
              <InputNumber
                min={0}
                max={1}
                step={0.01}
                value={record.targetWeight}
                className="w-full"
                onChange={value => {
                  const next = [...rows];
                  next[index] = {
                    ...record,
                    targetWeight: Number(value ?? 0),
                  };
                  setRows(next);
                }}
              />
            ),
          },
          {
            title: '角色',
            dataIndex: 'allocationRole',
            width: 140,
            render: (_value, record, index) => (
              <Select
                className="w-full"
                value={record.allocationRole}
                options={[
                  { value: 'core', label: 'core' },
                  { value: 'satellite', label: 'satellite' },
                  { value: 'watch', label: 'watch' },
                ]}
                onChange={value => {
                  const next = [...rows];
                  next[index] = { ...record, allocationRole: value };
                  setRows(next);
                }}
              />
            ),
          },
          {
            title: '',
            width: 80,
            render: (_value, record) => (
              <Button
                type="link"
                danger
                onClick={() =>
                  setRows(prev => prev.filter(row => row.key !== record.key))
                }
              >
                删除
              </Button>
            ),
          },
        ]}
      />
    </Card>
  );
}
