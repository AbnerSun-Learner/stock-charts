'use client';

import { Alert, Card, Col, Row, Statistic, Typography } from 'antd';
import type { DashboardMetrics } from '@/lib/investment/dashboard-metrics';
import { formatMoney, formatPercent } from '@/lib/investment/money';
import { formatReturnMetric } from '@/lib/investment/dashboard-metrics';

export interface PortfolioSummaryProps {
  metrics: DashboardMetrics;
  loading?: boolean;
}

/**
 * 总资产 / 现金比例 / XIRR / TWR 摘要。
 */
export function PortfolioSummary({ metrics, loading }: PortfolioSummaryProps) {
  const { totals, xirr, twr, warnings } = metrics;
  const empty = warnings.some(item => item.code === 'empty_ledger');

  return (
    <Card title="组合摘要" loading={loading}>
      {empty ? (
        <Typography.Text type="secondary">暂无账本数据</Typography.Text>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Statistic
              title="总资产（基础币种）"
              value={totals ? formatMoney(totals.totalAssetsBase) : '—'}
              suffix=""
              valueStyle={{ fontVariantNumeric: 'tabular-nums' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="现金比例"
              value={totals ? formatPercent(totals.cashRatio) : '—'}
              valueStyle={{ fontVariantNumeric: 'tabular-nums' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="XIRR"
              value={formatReturnMetric(xirr)}
              valueStyle={{
                fontVariantNumeric: 'tabular-nums',
                color:
                  xirr === null
                    ? undefined
                    : xirr >= 0
                      ? 'var(--success)'
                      : '#dc2626',
              }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="TWR"
              value={formatReturnMetric(twr)}
              valueStyle={{
                fontVariantNumeric: 'tabular-nums',
                color:
                  twr === null
                    ? undefined
                    : twr >= 0
                      ? 'var(--success)'
                      : '#dc2626',
              }}
            />
          </Col>
        </Row>
      )}
      {warnings
        .filter(item => item.code !== 'empty_ledger')
        .map(item => (
          <Alert
            key={`${item.code}-${item.message}`}
            className="mt-3"
            type="warning"
            showIcon
            message={item.message}
          />
        ))}
    </Card>
  );
}
