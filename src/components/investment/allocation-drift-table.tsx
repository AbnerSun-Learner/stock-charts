'use client';

import { Card, Empty, Table, Tag } from 'antd';
import type { AllocationDriftRow } from '@/lib/investment/rebalancing';
import { formatMoney, formatPercent } from '@/lib/investment/money';

export interface AllocationDriftTableProps {
  drifts: AllocationDriftRow[];
  loading?: boolean;
}

/**
 * 当前/目标权重与偏离表（现金桶展示为 CASH_BUCKET，非虚拟交易标的）。
 */
export function AllocationDriftTable({
  drifts,
  loading,
}: AllocationDriftTableProps) {
  if (!loading && drifts.length === 0) {
    return (
      <Card title="配置偏离">
        <Empty description="未设目标或缺少估值，暂无偏离数据" />
      </Card>
    );
  }

  return (
    <Card title="配置偏离" loading={loading}>
      <Table
        size="small"
        rowKey="instrumentId"
        pagination={false}
        dataSource={drifts}
        columns={[
          {
            title: '标的',
            dataIndex: 'instrumentId',
            render: (value: string) =>
              value === 'CASH_BUCKET' ? (
                <Tag color="blue">现金桶</Tag>
              ) : (
                <span className="tabular-nums">{value}</span>
              ),
          },
          {
            title: '当前',
            dataIndex: 'currentWeight',
            render: (value: number) => (
              <span className="tabular-nums">{formatPercent(value)}</span>
            ),
          },
          {
            title: '目标',
            dataIndex: 'targetWeight',
            render: (value: number) => (
              <span className="tabular-nums">{formatPercent(value)}</span>
            ),
          },
          {
            title: '绝对偏离',
            dataIndex: 'absoluteDrift',
            render: (value: number) => (
              <span className="tabular-nums">{formatPercent(value)}</span>
            ),
          },
          {
            title: '相对偏离',
            dataIndex: 'relativeDrift',
            render: (value: number | null) => (
              <span className="tabular-nums">
                {value === null ? '—' : formatPercent(value)}
              </span>
            ),
          },
          {
            title: '建议调仓额',
            dataIndex: 'deltaValueBase',
            render: (value: number) => (
              <span className="tabular-nums">{formatMoney(value)}</span>
            ),
          },
        ]}
      />
    </Card>
  );
}
