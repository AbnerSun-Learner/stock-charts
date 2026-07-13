'use client';

import { useState } from 'react';
import { Alert, Button, Card, Empty, Space, Table, Tag, message } from 'antd';
import type { RebalancePlanDraft } from '@/lib/investment/rebalancing';
import { toRebalancePlanEntity } from '@/lib/investment/rebalancing';
import type { InvestmentRepository } from '@/lib/supabase/investment-repository';
import { formatMoney } from '@/lib/investment/money';

export interface RebalanceActionsProps {
  draft: RebalancePlanDraft | null;
  repository: InvestmentRepository;
  onSaved: () => Promise<void>;
}

const TRIGGER_LABEL: Record<string, string> = {
  absolute_drift: '绝对偏离',
  relative_drift: '相对偏离',
  calendar_review: '定期复盘',
  cash_deployment: '现金部署',
};

/**
 * 再平衡计划预览与保存（写入 rebalance_plans，不生成 grid_plans）。
 */
export function RebalanceActions({
  draft,
  repository,
  onSaved,
}: RebalanceActionsProps) {
  const [saving, setSaving] = useState(false);

  if (!draft) {
    return (
      <Card title="再平衡建议">
        <Empty description="暂无再平衡计划（需有效目标配置与估值）" />
      </Card>
    );
  }

  const onSave = async () => {
    setSaving(true);
    const entity = toRebalancePlanEntity(draft, {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      reason: `Dashboard 生成：${TRIGGER_LABEL[draft.triggerReason] ?? draft.triggerReason}`,
    });
    const result = await repository.insertRebalancePlan(entity);
    setSaving(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success('已保存再平衡计划（rebalance_plans）');
    await onSaved();
  };

  return (
    <Card
      title="再平衡建议"
      extra={
        <Space>
          <Tag color="processing">
            {TRIGGER_LABEL[draft.triggerReason] ?? draft.triggerReason}
          </Tag>
          <Button
            type="primary"
            loading={saving}
            disabled={draft.plannedTrades.length === 0}
            onClick={onSave}
          >
            保存再平衡计划
          </Button>
        </Space>
      }
    >
      <Alert
        className="mb-3"
        type="info"
        showIcon
        message="本页只生成资产配置再平衡计划，不会创建网格计划。"
      />
      {draft.plannedTrades.length === 0 ? (
        <Empty description="当前偏离未产生建议成交" />
      ) : (
        <Table
          size="small"
          pagination={false}
          rowKey={row => `${row.instrumentId}-${row.side}`}
          dataSource={draft.plannedTrades}
          columns={[
            {
              title: '标的',
              dataIndex: 'instrumentId',
              render: (value: string) => (
                <span className="tabular-nums">{value}</span>
              ),
            },
            {
              title: '方向',
              dataIndex: 'side',
              render: (value: string) => (
                <Tag color={value === 'buy' ? 'green' : 'red'}>
                  {value === 'buy' ? '补仓' : '减仓'}
                </Tag>
              ),
            },
            {
              title: '建议金额（基础币种）',
              dataIndex: 'plannedAmountBase',
              render: (value: number) => (
                <span className="tabular-nums">{formatMoney(value)}</span>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
}
