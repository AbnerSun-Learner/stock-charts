'use client';

import { BaseInfoConfig } from '@/components/grid/base-info-config';
import { ErrorAlert } from '@/components/grid/error-alert';
import { FundCoefficientConfig } from '@/components/grid/fund-coefficient-config';
import { GridAntdProvider } from '@/components/grid/grid-antd-provider';
import { GridResultTable } from '@/components/grid/grid-result-table';
import { GridStepConfig } from '@/components/grid/grid-step-config';
import { LazyStrategyComparisonChart } from '@/components/grid/lazy-strategy-comparison-chart';
import { StatsCards } from '@/components/grid/stats-cards';
import { useGridCalculator } from '@/hooks/use-grid-calculator';
import { useGridParams } from '@/hooks/use-grid-params';
import { DEFAULT_GRID_PARAMS, type GridRow, type StressTest } from '@/types/grid';
import type { AggregatedGridRow, GridLeg, GridStrategyState, StrategyWarning } from '@/types/grid-v2';
import { message } from 'antd';
import { useState } from 'react';

/**
 * 网格交易策略页（Phase 1：V2 计算器）。
 */
export default function GridStrategyPage() {
  const [gridData, setGridData] = useState<GridRow[]>([]);
  const [stressTest, setStressTest] = useState<StressTest | null>(null);
  const [aggregatedRows, setAggregatedRows] = useState<AggregatedGridRow[]>([]);
  const [legs, setLegs] = useState<GridLeg[]>([]);
  const [amountPerGrid, setAmountPerGrid] = useState<number>(0);
  const [warnings, setWarnings] = useState<StrategyWarning[]>([]);
  const [calculationErrors, setCalculationErrors] = useState<string[]>([]);
  const [strategyState, setStrategyState] = useState<GridStrategyState | null>(
    null
  );
  const [dynamicGridEnabled, setDynamicGridEnabled] = useState(false);
  const [dynamicGridMode, setDynamicGridMode] = useState<
    'stable' | 'aggressive'
  >('stable');

  const { params, updateParam, updateBudgetMode, validateParams, errors, priceDecimals } =
    useGridParams(DEFAULT_GRID_PARAMS);

  const { calculateGrid } = useGridCalculator({
    params,
    validateParams,
    dynamicGridEnabled,
    dynamicGridMode,
  });

  const handleGenerateStrategy = () => {
    const validation = validateParams();
    if (!validation.isValid) {
      message.error('请检查参数设置');
      return;
    }

    const result = calculateGrid();

    setGridData(result.gridData);
    setStressTest(result.stressTest);
    setAggregatedRows(result.aggregatedRows);
    setLegs(result.legs);
    setAmountPerGrid(result.amountPerGrid);
    setWarnings(result.warnings);
    setCalculationErrors(result.calculationErrors);
    setStrategyState(result.state);

    if (result.calculationErrors.length > 0) {
      message.error(result.calculationErrors[0]);
      return;
    }

    message.success('策略已生成');
  };

  return (
    <div className="relative overflow-x-hidden text-[var(--foreground)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-90"
        aria-hidden
      >
        <div className="ds-hero-glow absolute inset-0" />
      </div>

      <GridAntdProvider>
        <div className="relative">
          <div className="site-container site-container--grid">
            <ErrorAlert errors={errors} />
            <ErrorAlert
              errors={calculationErrors}
              title="策略生成失败"
            />

            {warnings.length > 0 && gridData.length > 0 && (
              <div className="mb-4 space-y-2">
                {warnings.map(warning => (
                  <div
                    key={warning.code}
                    role="alert"
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      warning.level === 'error'
                        ? 'border-[var(--loss)] bg-[color-mix(in_srgb,var(--loss)_8%,var(--card))]'
                        : 'border-[color-mix(in_srgb,var(--accent-warm)_40%,var(--border))] bg-[color-mix(in_srgb,var(--accent-warm)_6%,var(--card))]'
                    }`}
                  >
                    {warning.message}
                  </div>
                ))}
              </div>
            )}

            {strategyState === 'stopped' && (
              <div
                role="status"
                className="mb-4 rounded-lg border border-[var(--loss)] bg-[color-mix(in_srgb,var(--loss)_8%,var(--card))] px-4 py-3 text-sm"
              >
                当前价格已跌破最低价边界。本策略不再自动加码，等待价格回到网格区间或人工重新评估
                basePrice/minPrice/总弹药。
              </div>
            )}

            <div className="grid grid-cols-12 gap-4 sm:gap-8 xl:gap-10">
              <div className="col-span-12 xl:col-span-4">
                <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--ds-shadow-md)]">
                  <div className="border-b border-[var(--border)]">
                    <BaseInfoConfig
                      minTradeUnit={params.minTradeUnit}
                      onMinTradeUnitChange={value =>
                        updateParam('minTradeUnit', value)
                      }
                      priceUnit={params.priceUnit}
                      onPriceUnitChange={value =>
                        updateParam('priceUnit', value)
                      }
                      basePrice={params.basePrice}
                      onBasePriceChange={value =>
                        updateParam('basePrice', value)
                      }
                      minPrice={params.minPrice}
                      onMinPriceChange={value =>
                        updateParam('minPrice', value)
                      }
                    />
                  </div>

                  <div className="border-b border-[var(--border)]">
                    <FundCoefficientConfig
                      totalBudget={params.totalBudget}
                      onTotalBudgetChange={value =>
                        updateParam('totalBudget', value)
                      }
                      budgetMode={params.budgetMode}
                      onBudgetModeChange={updateBudgetMode}
                      amountPerGrid={params.amountPerGrid}
                      onAmountPerGridChange={value =>
                        updateParam('amountPerGrid', value)
                      }
                      amountMultiplier={params.amountMultiplier}
                      onAmountMultiplierChange={value =>
                        updateParam('amountMultiplier', value)
                      }
                      profitReserveMultiplier={params.profitReserveMultiplier}
                      onProfitReserveMultiplierChange={value =>
                        updateParam('profitReserveMultiplier', value)
                      }
                    />
                  </div>

                  <div className="border-b border-[var(--border)]">
                    <GridStepConfig
                      baseStep={params.smallGridStep}
                      onBaseStepChange={value =>
                        updateParam('smallGridStep', value)
                      }
                      mediumStep={params.mediumGridStep}
                      onMediumStepChange={value =>
                        updateParam('mediumGridStep', value)
                      }
                      largeStep={params.largeGridStep}
                      onLargeStepChange={value =>
                        updateParam('largeGridStep', value)
                      }
                      dynamicEnabled={dynamicGridEnabled}
                      onDynamicEnabledChange={setDynamicGridEnabled}
                      mode={dynamicGridMode}
                      onModeChange={setDynamicGridMode}
                    />
                  </div>

                  <div className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-subtle)_55%,var(--card))] p-4 sm:p-6">
                    <button
                      type="button"
                      onClick={handleGenerateStrategy}
                      disabled={errors.length > 0}
                      className="marketing-primary-btn w-full px-6 py-3.5 text-sm font-semibold tracking-wide disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none"
                    >
                      生成策略
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-span-12 space-y-8 xl:col-span-8">
                {gridData.length === 0 || !stressTest ? (
                  <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)] px-4 shadow-[var(--ds-shadow-sm)] backdrop-blur-[2px] sm:min-h-[480px] sm:px-6 lg:min-h-[520px]">
                    <div className="max-w-sm text-center">
                      <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
                        {calculationErrors.length > 0
                          ? '未能生成有效档位'
                          : '尚无计算结果'}
                      </p>
                      <p className="text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                        {calculationErrors.length > 0
                          ? calculationErrors[0]
                          : '完成左侧参数配置后点击「生成策略」，策略优势推演与明细表格将在此呈现'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--ds-shadow-md)] sm:p-6 md:p-8">
                      <LazyStrategyComparisonChart
                        gridData={gridData}
                        basePrice={params.basePrice}
                        priceDecimals={priceDecimals}
                      />
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--ds-shadow-md)] sm:p-6 md:p-8">
                      <div className="mb-6 border-b border-[var(--border)] pb-4 sm:mb-8 sm:pb-6">
                        <p className="ds-card-eyebrow mb-2">Results</p>
                        <h3 className="text-lg font-semibold tracking-[-0.01em] text-[var(--foreground)]">
                          网格计算结果
                        </h3>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          共 {gridData.length} 个网格档位 ·{' '}
                          {aggregatedRows.length} 个聚合组
                        </p>
                      </div>

                      <StatsCards
                        stressTest={stressTest}
                        amountPerGrid={
                          params.budgetMode === 'auto' ? amountPerGrid : undefined
                        }
                      />
                      <GridResultTable
                        aggregatedRows={aggregatedRows}
                        legs={legs}
                        basePrice={params.basePrice}
                        priceDecimals={priceDecimals}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </GridAntdProvider>
    </div>
  );
}
