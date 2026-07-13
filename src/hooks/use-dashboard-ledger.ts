'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { InvestmentRepository } from '@/lib/supabase/investment-repository';
import type {
  CashAccount,
  CashFlow,
  PortfolioSettings,
  PortfolioSnapshot,
  Position,
  TargetAllocation,
  TradeRecord,
} from '@/types/investment';
import {
  computeDashboardMetrics,
  type DashboardMetrics,
} from '@/lib/investment/dashboard-metrics';
import {
  filterLedgerAsOfDate,
  resolveLatestValuationDate,
} from '@/lib/investment/valuation-date';

export interface DashboardLedgerState {
  loading: boolean;
  error: string | null;
  settings: PortfolioSettings | null;
  targets: TargetAllocation[];
  positions: Position[];
  cashAccounts: CashAccount[];
  cashFlows: CashFlow[];
  trades: TradeRecord[];
  snapshots: PortfolioSnapshot[];
  metrics: DashboardMetrics;
  valuationDate: string | null;
  refresh: () => Promise<void>;
  repository: InvestmentRepository;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 拉取当前用户账本并派生 Dashboard 指标。
 */
export function useDashboardLedger(): DashboardLedgerState {
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const repository = useMemo(() => new InvestmentRepository(client), [client]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PortfolioSettings | null>(null);
  const [targets, setTargets] = useState<TargetAllocation[]>([]);
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [allCashAccounts, setAllCashAccounts] = useState<CashAccount[]>([]);
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [
      settingsRes,
      targetsRes,
      positionsRes,
      cashRes,
      flowsRes,
      tradesRes,
      snapsRes,
    ] = await Promise.all([
      repository.getPortfolioSettings(),
      repository.listTargetAllocations(),
      repository.listPositions(),
      repository.listCashAccounts(),
      repository.listCashFlows(),
      repository.listTrades(),
      repository.listPortfolioSnapshots(),
    ]);

    const firstError = [
      settingsRes,
      targetsRes,
      positionsRes,
      cashRes,
      flowsRes,
      tradesRes,
      snapsRes,
    ].find(result => !result.ok);

    if (firstError && !firstError.ok) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setSettings(settingsRes.ok ? settingsRes.value : null);
    setTargets(targetsRes.ok ? targetsRes.value : []);
    setAllPositions(positionsRes.ok ? positionsRes.value : []);
    setAllCashAccounts(cashRes.ok ? cashRes.value : []);
    setCashFlows(flowsRes.ok ? flowsRes.value : []);
    setTrades(tradesRes.ok ? tradesRes.value : []);
    setSnapshots(snapsRes.ok ? snapsRes.value : []);
    setLoading(false);
  }, [repository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const valuationDate = useMemo(
    () => resolveLatestValuationDate([...allPositions, ...allCashAccounts]),
    [allPositions, allCashAccounts]
  );

  const positions = useMemo(
    () => filterLedgerAsOfDate(allPositions, valuationDate),
    [allPositions, valuationDate]
  );
  const cashAccounts = useMemo(
    () => filterLedgerAsOfDate(allCashAccounts, valuationDate),
    [allCashAccounts, valuationDate]
  );

  const metrics = useMemo(
    () =>
      computeDashboardMetrics({
        settings,
        targets,
        positions,
        cashAccounts,
        cashFlows,
        snapshots,
        valuationDate: valuationDate ?? todayIso(),
      }),
    [
      settings,
      targets,
      positions,
      cashAccounts,
      cashFlows,
      snapshots,
      valuationDate,
    ]
  );

  return {
    loading,
    error,
    settings,
    targets,
    positions,
    cashAccounts,
    cashFlows,
    trades,
    snapshots,
    metrics,
    valuationDate,
    refresh,
    repository,
  };
}
