'use client';

import { ErrorAlert } from '@/components/grid/error-alert';
import { GridAntdProvider } from '@/components/grid/grid-antd-provider';
import { GridParamsPanel } from '@/components/grid/grid-params-panel';
import { GridParamsSummaryBar } from '@/components/grid/grid-params-summary-bar';
import { GridPrimaryKpiRow } from '@/components/grid/grid-primary-kpi-row';
import { GridResultTable } from '@/components/grid/grid-result-table';
import { LazyStrategyComparisonChart } from '@/components/grid/lazy-strategy-comparison-chart';
import { StatsCards } from '@/components/grid/stats-cards';
import { useGridCalculator } from '@/hooks/use-grid-calculator';
import { useGridParams } from '@/hooks/use-grid-params';
import { DEFAULT_GRID_PARAMS, type GridRow, type StressTest } from '@/types/grid';
import type { AggregatedGridRow, GridLeg, GridStrategyState, StrategyWarning } from '@/types/grid-v2';
import { Button, Drawer, Grid, message } from 'antd';
import { useEffect, useRef, useState } from 'react';

/**
 * 网格交易策略页（Coinbase 双态布局：idle 配参 / result 全宽结果）。
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
  const [paramsDrawerOpen, setParamsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const shellRef = useRef<HTMLElement | null>(null);

  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setIsMobile(!(screens.md ?? false));
  }, [screens.md]);

  useEffect(() => {
    shellRef.current = document.querySelector('.grid-shell');
  }, []);

  const { params, updateParam, updateBudgetMode, validateParams, errors, priceDecimals } =
    useGridParams(DEFAULT_GRID_PARAMS);

  const { calculateGrid } = useGridCalculator({
    params,
    validateParams,
    dynamicGridEnabled,
    dynamicGridMode,
  });

  const hasResult =
    gridData.length > 0 &&
    stressTest !== null &&
    calculationErrors.length === 0;

  const applyCalculationResult = () => {
    const validation = validateParams();
    if (!validation.isValid) {
      message.error('请检查参数设置');
      return false;
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
      return false;
    }

    message.success('策略已生成');
    return true;
  };

  const handleGenerateStrategy = () => {
    const ok = applyCalculationResult();
    if (ok) {
      requestAnimationFrame(() => {
        document
          .getElementById('grid-primary-kpis')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const handleRegenerate = () => {
    const ok = applyCalculationResult();
    if (ok) {
      setParamsDrawerOpen(false);
      requestAnimationFrame(() => {
        document
          .getElementById('grid-primary-kpis')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const paramsPanelProps = {
    minTradeUnit: params.minTradeUnit,
    onMinTradeUnitChange: (value: number | null) =>
      updateParam('minTradeUnit', value),
    priceUnit: params.priceUnit,
    onPriceUnitChange: (value: number | null) => updateParam('priceUnit', value),
    basePrice: params.basePrice,
    onBasePriceChange: (value: number | null) => updateParam('basePrice', value),
    minPrice: params.minPrice,
    onMinPriceChange: (value: number | null) => updateParam('minPrice', value),
    totalBudget: params.totalBudget,
    onTotalBudgetChange: (value: number | null) =>
      updateParam('totalBudget', value),
    budgetMode: params.budgetMode,
    onBudgetModeChange: updateBudgetMode,
    amountPerGrid: params.amountPerGrid,
    onAmountPerGridChange: (value: number | null) =>
      updateParam('amountPerGrid', value),
    amountMultiplier: params.amountMultiplier,
    onAmountMultiplierChange: (value: number | null) =>
      updateParam('amountMultiplier', value),
    profitReserveMultiplier: params.profitReserveMultiplier,
    onProfitReserveMultiplierChange: (value: number | null) =>
      updateParam('profitReserveMultiplier', value),
    baseStep: params.smallGridStep,
    onBaseStepChange: (value: number) => updateParam('smallGridStep', value),
    mediumStep: params.mediumGridStep,
    onMediumStepChange: (value: number) => updateParam('mediumGridStep', value),
    largeStep: params.largeGridStep,
    onLargeStepChange: (value: number) => updateParam('largeGridStep', value),
    dynamicEnabled: dynamicGridEnabled,
    onDynamicEnabledChange: setDynamicGridEnabled,
    mode: dynamicGridMode,
    onModeChange: setDynamicGridMode,
  };

  const generateFooter = (
    <div className="space-y-2">
      <Button
        type="primary"
        size="large"
        shape="round"
        block
        onClick={handleGenerateStrategy}
        disabled={errors.length > 0}
      >
        生成策略
      </Button>
      {errors.length > 0 ? (
        <p className="text-xs text-[var(--loss)]">{errors[0]}</p>
      ) : null}
    </div>
  );

  const regenerateFooter = (
    <div className="space-y-2">
      <Button
        type="primary"
        size="large"
        shape="round"
        block
        onClick={handleRegenerate}
        disabled={errors.length > 0}
      >
        重新生成
      </Button>
      {errors.length > 0 ? (
        <p className="text-xs text-[var(--loss)]">{errors[0]}</p>
      ) : null}
    </div>
  );

  const statusBlocks = (
    <>
      {warnings.length > 0 && hasResult && (
        <div className="mb-4 space-y-2">
          {warnings.map(warning => (
            <div
              key={warning.code}
              role="alert"
              className={`rounded-[var(--radius-compact)] border px-4 py-3 text-sm ${
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
          className="mb-4 rounded-[var(--radius-compact)] border border-[var(--loss)] bg-[color-mix(in_srgb,var(--loss)_8%,var(--card))] px-4 py-3 text-sm"
        >
          当前价格已跌破最低价边界。本策略不再自动加码，等待价格回到网格区间或人工重新评估
          basePrice/minPrice/总弹药。
        </div>
      )}
    </>
  );

  return (
    <div className="relative overflow-x-hidden text-[var(--foreground)]">
      <GridAntdProvider>
        <div className="relative">
          <div className="site-container site-container--grid py-6 sm:py-8">
            <header className="mb-6 sm:mb-8">
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl">
                网格交易策略
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
                配置价格边界与弹药，生成档位并查看资金压力与收益推演
              </p>
            </header>

            {!hasResult ? (
              <>
                <ErrorAlert errors={errors} />
                <ErrorAlert
                  errors={calculationErrors}
                  title="策略生成失败"
                />

                <div className="grid grid-cols-12 gap-4 sm:gap-8 xl:gap-10">
                  <div className="col-span-12 xl:col-span-4">
                    <GridParamsPanel
                      {...paramsPanelProps}
                      footer={generateFooter}
                    />
                  </div>

                  <div className="col-span-12 xl:col-span-8">
                    <div className="flex min-h-[320px] items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] px-4 sm:min-h-[480px] sm:px-6 lg:min-h-[520px]">
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
                        {calculationErrors.length > 0 ? (
                          <button
                            type="button"
                            className="mt-4 text-sm font-semibold text-[var(--accent)]"
                            onClick={() => setCalculationErrors([])}
                          >
                            返回修改
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <GridParamsSummaryBar
                  basePrice={params.basePrice}
                  minPrice={params.minPrice}
                  totalBudget={params.totalBudget}
                  amountPerGrid={params.amountPerGrid}
                  budgetMode={params.budgetMode}
                  gridCount={gridData.length}
                  priceDecimals={priceDecimals}
                  onEdit={() => setParamsDrawerOpen(true)}
                />

                {statusBlocks}

                <div className="space-y-8">
                  <GridPrimaryKpiRow stressTest={stressTest} />

                  <div className="grid-card p-4 sm:p-6 md:p-8">
                    <LazyStrategyComparisonChart
                      gridData={gridData}
                      basePrice={params.basePrice}
                      priceDecimals={priceDecimals}
                    />
                  </div>

                  <div className="grid-card p-4 sm:p-6 md:p-8">
                    <div className="mb-6 border-b border-[var(--border)] pb-4 sm:mb-8 sm:pb-6">
                      <h3 className="ds-section-title text-lg">
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
                      omitPrimary
                    />
                    <div className="overflow-x-auto">
                      <GridResultTable
                        aggregatedRows={aggregatedRows}
                        legs={legs}
                        basePrice={params.basePrice}
                        priceDecimals={priceDecimals}
                      />
                    </div>
                  </div>
                </div>

                <Drawer
                  title="修改参数"
                  open={paramsDrawerOpen}
                  onClose={() => setParamsDrawerOpen(false)}
                  placement={isMobile ? 'bottom' : 'right'}
                  width={isMobile ? undefined : 420}
                  height={isMobile ? '90%' : undefined}
                  destroyOnHidden={false}
                  // 挂到 .grid-shell，继承页面 token / InputNumber 等作用域样式
                  getContainer={() => shellRef.current ?? document.body}
                  rootClassName="grid-params-drawer"
                  styles={{
                    body: { padding: 16 },
                  }}
                >
                  <ErrorAlert errors={errors} />
                  <GridParamsPanel
                    {...paramsPanelProps}
                    embedded
                    footer={regenerateFooter}
                  />
                </Drawer>
              </>
            )}
          </div>
        </div>
      </GridAntdProvider>
    </div>
  );
}
