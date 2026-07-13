'use client';

import { Card, Empty, Progress, Table } from 'antd';
import { calculateCurrencyExposure } from '@/lib/investment/portfolio';
import type { CashAccount, Position } from '@/types/investment';
import { formatMoney, formatPercent } from '@/lib/investment/money';

export interface CurrencyExposureProps {
  positions: Position[];
  cashAccounts: CashAccount[];
  loading?: boolean;
}

/**
 * CNY / HKD / USD 暴露。
 */
export function CurrencyExposure({
  positions,
  cashAccounts,
  loading,
}: CurrencyExposureProps) {
  const result = calculateCurrencyExposure(positions, cashAccounts);

  if (!result.ok) {
    return (
      <Card title="币种暴露" loading={loading}>
        <Empty description={result.message} />
      </Card>
    );
  }

  if (result.value.length === 0) {
    return (
      <Card title="币种暴露" loading={loading}>
        <Empty description="暂无币种暴露数据" />
      </Card>
    );
  }

  return (
    <Card title="币种暴露" loading={loading}>
      <Table
        size="small"
        pagination={false}
        rowKey="currency"
        dataSource={result.value}
        columns={[
          { title: '币种', dataIndex: 'currency' },
          {
            title: '持仓（基础币种）',
            dataIndex: 'marketValueBase',
            render: (value: number) => (
              <span className="tabular-nums">{formatMoney(value)}</span>
            ),
          },
          {
            title: '现金（基础币种）',
            dataIndex: 'cashBalanceBase',
            render: (value: number) => (
              <span className="tabular-nums">{formatMoney(value)}</span>
            ),
          },
          {
            title: '占比',
            dataIndex: 'weight',
            render: (value: number) => (
              <div className="min-w-[120px]">
                <div className="mb-1 tabular-nums">{formatPercent(value)}</div>
                <Progress
                  percent={Math.round(value * 1000) / 10}
                  showInfo={false}
                  size="small"
                />
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}
