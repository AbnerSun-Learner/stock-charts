import type {
  CashAccount,
  CashFlow,
  PortfolioSettings,
  PortfolioSnapshot,
  Position,
  TargetAllocation,
} from '@/types/investment';
import { calculatePortfolioTotals } from '@/lib/investment/portfolio';
import {
  calculateXirr,
  calculateTwr,
  extractTwrExternalFlows,
  extractXirrExternalFlows,
} from '@/lib/investment/returns';
import {
  buildRebalancePlan,
  calculateAllocationDrift,
  type AllocationDriftRow,
  type RebalancePlanDraft,
} from '@/lib/investment/rebalancing';
import { formatPercent } from '@/lib/investment/money';

export type DashboardWarningCode =
  | 'empty_ledger'
  | 'missing_valuation'
  | 'missing_targets'
  | 'returns_unavailable';

export interface DashboardWarning {
  code: DashboardWarningCode;
  message: string;
}

export interface DashboardMetrics {
  totals: {
    totalAssetsBase: number;
    cashValueBase: number;
    totalMarketValueBase: number;
    cashRatio: number;
  } | null;
  xirr: number | null;
  twr: number | null;
  drifts: AllocationDriftRow[];
  rebalanceDraft: RebalancePlanDraft | null;
  warnings: DashboardWarning[];
}

/**
 * 从账本事实派生 Dashboard KPI / 偏离 / 再平衡草稿（纯函数，无 IO）。
 */
export function computeDashboardMetrics(input: {
  settings: PortfolioSettings | null;
  targets: TargetAllocation[];
  positions: Position[];
  cashAccounts: CashAccount[];
  cashFlows: CashFlow[];
  snapshots: PortfolioSnapshot[];
  valuationDate: string;
}): DashboardMetrics {
  const warnings: DashboardWarning[] = [];
  const empty =
    input.positions.length === 0 &&
    input.cashAccounts.length === 0 &&
    input.cashFlows.length === 0;

  if (empty) {
    warnings.push({
      code: 'empty_ledger',
      message: '尚无持仓、现金或现金流，请先录入或导入账本数据',
    });
  }

  if (input.targets.length === 0) {
    warnings.push({
      code: 'missing_targets',
      message: '尚未设置目标配置，无法计算偏离与再平衡计划',
    });
  }

  const totalsResult = calculatePortfolioTotals(
    input.positions,
    input.cashAccounts
  );
  if (!totalsResult.ok) {
    warnings.push({
      code: 'missing_valuation',
      message: totalsResult.message,
    });
  }

  const totals = totalsResult.ok ? totalsResult.value : null;
  let xirr: number | null = null;
  let twr: number | null = null;

  if (totals) {
    const xirrResult = calculateXirr({
      externalCashFlows: extractXirrExternalFlows(input.cashFlows),
      terminalValueBase: totals.totalAssetsBase,
      valuationDate: input.valuationDate,
    });
    if (xirrResult.ok) {
      xirr = xirrResult.value;
    } else {
      warnings.push({
        code: 'returns_unavailable',
        message: `XIRR 暂不可用：${xirrResult.error}`,
      });
    }
  }

  if (input.snapshots.length >= 2) {
    // Dashboard 口径：按已有 portfolio_snapshots 连乘；不自行补齐交易日历缺日
    const dates = input.snapshots.map(snap => snap.asOfDate);
    const twrResult = calculateTwr({
      snapshots: input.snapshots,
      externalCashFlows: extractTwrExternalFlows(input.cashFlows),
      cashFlowTiming: 'end_of_day',
      expectedValuationDates: dates,
    });
    if (twrResult.ok) {
      twr = twrResult.value;
    } else {
      warnings.push({
        code: 'returns_unavailable',
        message: `TWR 暂不可用：${twrResult.error}`,
      });
    }
  }

  let drifts: AllocationDriftRow[] = [];
  let rebalanceDraft: RebalancePlanDraft | null = null;
  const cashTargetWeight = input.settings?.cashTargetWeight ?? 0;

  if (input.targets.length > 0 && totalsResult.ok) {
    const driftResult = calculateAllocationDrift({
      targets: input.targets,
      cashTargetWeight,
      positions: input.positions,
      cashAccounts: input.cashAccounts,
    });
    if (driftResult.ok) {
      drifts = driftResult.value;
    } else {
      warnings.push({
        code: 'missing_valuation',
        message: driftResult.message,
      });
    }

    const planResult = buildRebalancePlan({
      targets: input.targets,
      cashTargetWeight,
      positions: input.positions,
      cashAccounts: input.cashAccounts,
      absoluteDriftThreshold: input.settings?.absoluteDriftThreshold ?? 0.05,
      relativeDriftThreshold: input.settings?.relativeDriftThreshold ?? 0.2,
      requireSufficientCash: false,
    });
    if (planResult.ok) {
      rebalanceDraft = planResult.value;
    }
  }

  return { totals, xirr, twr, drifts, rebalanceDraft, warnings };
}

/** 展示用收益率文案 */
export function formatReturnMetric(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return formatPercent(value, 2);
}
