import type { StressTest } from '@/types/grid';

/** 网格页 KPI 展示项 */
export interface GridKpiItem {
  label: string;
  value: string;
  tooltip?: string | null;
  color?: string | null;
}

function signedAmount(value: number): string {
  return (value > 0 ? '+' : '') + Math.round(value).toLocaleString();
}

function toneBySign(value: number): string | null {
  if (value > 0) return 'var(--profit)';
  if (value < 0) return 'var(--loss)';
  return null;
}

/**
 * 从压力测试结果映射结果态顶部主 KPI（V2 四卡 / legacy 三卡）。
 */
export function buildPrimaryKpis(stressTest: StressTest): GridKpiItem[] {
  const v2 = stressTest.v2;
  if (!v2) {
    return [
      {
        label: '总买入金额',
        value: stressTest.totalBuyAmount.toLocaleString(),
        tooltip: null,
      },
      {
        label: '收益率',
        value:
          (stressTest.profitRate > 0 ? '+' : '') + stressTest.profitRate + '%',
        color: toneBySign(stressTest.profitRate),
        tooltip: '利润 / 买入金额 × 100',
      },
      {
        label: '预期利润',
        value: signedAmount(stressTest.profit),
        color: toneBySign(stressTest.profit),
        tooltip: '利润 = 卖出金额 - 买入金额 + 剩余股数 × 基准价',
      },
    ];
  }

  return [
    {
      label: '预算使用率',
      value: `${(v2.budgetUsageRate * 100).toFixed(1)}%`,
      tooltip: '预计最大投入 / 总弹药',
    },
    {
      label: '预计最大投入',
      value: Math.round(v2.totalBudgetRequired).toLocaleString(),
      tooltip: '所有档位买入成本（含佣金）之和',
    },
    {
      label: '扣费后收益率',
      value:
        (v2.realizedGridProfitRate > 0 ? '+' : '') +
        v2.realizedGridProfitRate.toFixed(2) +
        '%',
      color: toneBySign(v2.realizedGridProfitRate),
      tooltip: '已实现网格利润 / 预计最大投入',
    },
    {
      label: '综合净利润',
      value: signedAmount(v2.totalNetProfit),
      color: toneBySign(v2.totalNetProfit),
      tooltip: '已实现网格利润 + 底仓浮盈',
    },
  ];
}
