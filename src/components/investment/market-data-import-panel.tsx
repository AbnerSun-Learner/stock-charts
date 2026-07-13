'use client';

import { useState } from 'react';
import { Alert, Button, Card, Empty, Input, Space, Table, message } from 'antd';
import type { FxRate, PriceBar } from '@/types/investment';
import type { InvestmentRepository } from '@/lib/supabase/investment-repository';
import { formatMoney } from '@/lib/investment/money';

export interface MarketDataImportPanelProps {
  repository: InvestmentRepository;
}

/**
 * 行情/汇率只读面板；禁止作为共享表主写入路径。
 */
export function MarketDataImportPanel({
  repository,
}: MarketDataImportPanelProps) {
  const [instrumentId, setInstrumentId] = useState('510300.SH');
  const [loading, setLoading] = useState(false);
  const [fxRows, setFxRows] = useState<FxRate[]>([]);
  const [priceRows, setPriceRows] = useState<PriceBar[]>([]);

  const load = async () => {
    setLoading(true);
    const [fx, prices] = await Promise.all([
      repository.listFxRates(),
      repository.listPriceBars({ instrumentId: instrumentId.trim() }),
    ]);
    setLoading(false);
    if (!fx.ok) {
      message.error(fx.message);
      return;
    }
    if (!prices.ok) {
      message.error(prices.message);
      return;
    }
    setFxRows(fx.value.slice(-30));
    setPriceRows(prices.value.slice(-30));
  };

  return (
    <Card
      title="行情与汇率（只读）"
      extra={
        <Space>
          <Input
            value={instrumentId}
            onChange={event => setInstrumentId(event.target.value)}
            placeholder="规范代码"
            style={{ width: 160 }}
          />
          <Button loading={loading} onClick={load}>
            读取
          </Button>
        </Space>
      }
    >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="价格来自 etf_daily，汇率来自 fx_rates。本仓禁止写入共享行情表；CSV 仅应急补洞（当前只读）。"
      />
      <div className="mb-4">
        <div className="mb-2 font-medium">最近汇率</div>
        {fxRows.length === 0 ? (
          <Empty description="点击读取加载 fx_rates" />
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey={row =>
              `${row.date}-${row.fromCurrency}-${row.toCurrency}`
            }
            dataSource={fxRows}
            columns={[
              { title: '日期', dataIndex: 'date' },
              {
                title: '货币对',
                render: (_value, row) =>
                  `${row.fromCurrency}/${row.toCurrency}`,
              },
              {
                title: '汇率',
                dataIndex: 'rate',
                render: (value: number) => (
                  <span className="tabular-nums">{value}</span>
                ),
              },
            ]}
          />
        )}
      </div>
      <div>
        <div className="mb-2 font-medium">最近行情（优先前复权）</div>
        {priceRows.length === 0 ? (
          <Empty description="点击读取加载 etf_daily" />
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey={row => `${row.instrumentId}-${row.date}`}
            dataSource={priceRows}
            columns={[
              { title: '日期', dataIndex: 'date' },
              {
                title: '收盘',
                dataIndex: 'close',
                render: (value: number) => (
                  <span className="tabular-nums">{formatMoney(value)}</span>
                ),
              },
              {
                title: '标的',
                dataIndex: 'instrumentId',
                render: (value: string) => (
                  <span className="tabular-nums">{value}</span>
                ),
              },
            ]}
          />
        )}
      </div>
    </Card>
  );
}
