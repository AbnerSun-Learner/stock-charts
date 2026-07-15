'use client';

import { Alert, Col, Row, Spin, Tabs, Typography } from 'antd';
import { useDashboardLedger } from '@/hooks/use-dashboard-ledger';
import { PortfolioSummary } from '@/components/investment/portfolio-summary';
import { PortfolioSettingsForm } from '@/components/investment/portfolio-settings-form';
import { TargetAllocationForm } from '@/components/investment/target-allocation-form';
import { AllocationDriftTable } from '@/components/investment/allocation-drift-table';
import { RebalanceActions } from '@/components/investment/rebalance-actions';
import { CurrencyExposure } from '@/components/investment/currency-exposure';
import { CashFlowForm } from '@/components/investment/cash-flow-form';
import { CsvImportPanel } from '@/components/investment/csv-import-panel';
import { MarketDataImportPanel } from '@/components/investment/market-data-import-panel';

/**
 * 组合 Dashboard 看板：编排账本读写与纯函数指标。
 */
export function DashboardWorkbench() {
  const ledger = useDashboardLedger();

  if (ledger.loading && !ledger.settings && ledger.positions.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin tip="加载组合账本…" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="mb-2">
        <Typography.Title level={3} className="!mb-1">
          组合看板
        </Typography.Title>
      </header>

      {ledger.error ? (
        <Alert type="error" showIcon message={ledger.error} />
      ) : null}

      <PortfolioSummary metrics={ledger.metrics} loading={ledger.loading} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <AllocationDriftTable
            drifts={ledger.metrics.drifts}
            loading={ledger.loading}
          />
        </Col>
        <Col xs={24} lg={10}>
          <CurrencyExposure
            positions={ledger.positions}
            cashAccounts={ledger.cashAccounts}
            loading={ledger.loading}
          />
        </Col>
      </Row>

      <RebalanceActions
        draft={ledger.metrics.rebalanceDraft}
        repository={ledger.repository}
        onSaved={ledger.refresh}
      />

      <Tabs
        items={[
          {
            key: 'settings',
            label: '组合设置',
            children: (
              <PortfolioSettingsForm
                settings={ledger.settings}
                repository={ledger.repository}
                onSaved={ledger.refresh}
              />
            ),
          },
          {
            key: 'targets',
            label: '目标配置',
            children: (
              <TargetAllocationForm
                targets={ledger.targets}
                cashTargetWeight={ledger.settings?.cashTargetWeight ?? 0}
                repository={ledger.repository}
                onSaved={ledger.refresh}
              />
            ),
          },
          {
            key: 'cash',
            label: '现金流',
            children: (
              <CashFlowForm
                repository={ledger.repository}
                onSaved={ledger.refresh}
              />
            ),
          },
          {
            key: 'import',
            label: 'CSV 导入',
            children: (
              <CsvImportPanel
                repository={ledger.repository}
                onImported={ledger.refresh}
              />
            ),
          },
          {
            key: 'market',
            label: '行情只读',
            children: (
              <MarketDataImportPanel repository={ledger.repository} />
            ),
          },
        ]}
      />
    </div>
  );
}
