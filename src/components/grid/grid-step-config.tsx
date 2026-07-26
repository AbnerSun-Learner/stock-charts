"use client";

import { HelpTooltip } from "@/components/shared/help-tooltip";
import { InputNumber } from "antd";
import { Filter, Shield } from "lucide-react";

interface GridStepConfigProps {
  baseStep: number;
  onBaseStepChange: (value: number) => void;
  mediumStep: number;
  onMediumStepChange: (value: number) => void;
  largeStep: number;
  onLargeStepChange: (value: number) => void;
  dynamicEnabled: boolean;
  onDynamicEnabledChange: (enabled: boolean) => void;
  mode: "stable" | "aggressive";
  onModeChange: (mode: "stable" | "aggressive") => void;
  /** 嵌套在可折叠摘要内时隐藏重复标题 */
  compactHeader?: boolean;
}

export function GridStepConfig({
  baseStep,
  onBaseStepChange,
  mediumStep,
  onMediumStepChange,
  largeStep,
  onLargeStepChange,
  dynamicEnabled,
  onDynamicEnabledChange,
  mode,
  onModeChange,
  compactHeader = false,
}: GridStepConfigProps) {
  function getScaleFactor() {
    return mode === "stable" ? 0.3 : 0.6;
  }

  function normalizeValue(value: number | null, fallback: number) {
    if (value === null) return fallback;
    return value;
  }

  function handleBaseStepChange(value: number | null) {
    onBaseStepChange(normalizeValue(value, 1));
  }

  function handleMediumStepChange(value: number | null) {
    onMediumStepChange(normalizeValue(value, 15));
  }

  function handleLargeStepChange(value: number | null) {
    onLargeStepChange(normalizeValue(value, 30));
  }

  const formulaTooltip = (
    <>
      <div className="mb-2 font-semibold text-[var(--foreground)]">
        计算逻辑公式：
      </div>
      <div className="space-y-1 font-mono text-[11px] text-[var(--muted-foreground)]">
        <div>P₁ = 基准价</div>
        <div>P₂ = P₁ × (1 - Step_initial)</div>
        <div>Pₙ = Pₙ₋₁ × (1 - Stepₙ₋₁)</div>
        <div className="mt-2 border-t border-[var(--border)] pt-2">
          <div className="text-[var(--foreground)]">动态步长更新：</div>
          <div>Stepₙ = Stepₙ₋₁ × (1 + Scale)</div>
          <div className="mt-1 text-[11px] leading-snug">
            稳健模式 Scale=0.3 · 抄底模式 Scale=0.6
          </div>
        </div>
      </div>
    </>
  );

  const dynamicSwitch = (
    <div className="flex shrink-0 items-center gap-3 sm:pt-1">
      <label
        htmlFor="dynamic-switch"
        className="cursor-pointer text-xs font-medium text-[var(--foreground)]"
      >
        启用动态间距
      </label>
      <button
        id="dynamic-switch"
        role="switch"
        aria-checked={dynamicEnabled}
        type="button"
        onClick={() => onDynamicEnabledChange(!dynamicEnabled)}
        className={`relative inline-flex h-7 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] ${
          dynamicEnabled
            ? "bg-[var(--accent)]"
            : "bg-[color-mix(in_srgb,var(--muted-foreground)_28%,var(--border))]"
        }`}
      >
        <span
          className={`inline-block h-[18px] w-[18px] transform rounded-full bg-[var(--card)] shadow-[var(--ds-shadow-sm)] transition-transform duration-200 ${
            dynamicEnabled ? "translate-x-[22px]" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-4 p-4 sm:p-6 md:p-7">
      {compactHeader ? (
        <div className="mb-2 flex items-center justify-end gap-3">
          <HelpTooltip
            size="md"
            placement="bottomLeft"
            maxWidth="20rem"
            title={formulaTooltip}
          />
          {dynamicSwitch}
        </div>
      ) : (
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="ds-section-title">网格步长</h3>
              <HelpTooltip
                size="md"
                placement="bottomLeft"
                maxWidth="20rem"
                title={formulaTooltip}
              />
            </div>
          </div>
          {dynamicSwitch}
        </div>
      )}

      <div className="space-y-5">
        {/* 基础步长配置区 - 常驻 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="base-step-input"
              className="flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]"
            >
              <span className="text-[var(--loss)]">*</span>
              基础步长（小网）
            </label>
          </div>

          <InputNumber
            id="base-step-input"
            value={baseStep}
            onChange={handleBaseStepChange}
            precision={1}
            min={0.1}
            max={99}
            controls={false}
            addonAfter="%"
            className="w-full"
            style={{
              width: "100%",
              textAlign: "center",
              fontWeight: 600,
              fontSize: "16px",
            }}
          />
        </div>

        {/* 中网步长和大网步长配置区 - 一行两列 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 中网步长配置区 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="medium-step-input"
                className="flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]"
              >
                <span className="text-[var(--loss)]">*</span>
                中网步长
              </label>
            </div>

            <InputNumber
              id="medium-step-input"
              value={mediumStep}
              onChange={handleMediumStepChange}
              precision={1}
              min={0.1}
              max={100}
              controls={false}
              addonAfter="%"
              className="w-full"
              style={{
                width: "100%",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "16px",
              }}
            />
          </div>

          {/* 大网步长配置区 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="large-step-input"
                className="flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]"
              >
                <span className="text-[var(--loss)]">*</span>
                大网步长
              </label>
            </div>

            <InputNumber
              id="large-step-input"
              value={largeStep}
              onChange={handleLargeStepChange}
              precision={1}
              min={0.1}
              max={100}
              controls={false}
              addonAfter="%"
              className="w-full"
              style={{
                width: "100%",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "16px",
              }}
            />
          </div>
        </div>

        {/* 动态模式提示 */}
        {dynamicEnabled && (
          <div className="rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--accent)_5%,var(--card))] px-3 py-2.5">
            <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
              动态模式已激活，步长会随网格档位按所选模式逐级扩张。
            </p>
          </div>
        )}

        {/* 动态增强面板 - 展开层 */}
        {dynamicEnabled && (
          <div className="space-y-4 pt-1">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              感官模式
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 稳健模式卡片 */}
              <button
                type="button"
                onClick={() => onModeChange("stable")}
                className={`relative rounded-xl border p-4 text-left transition-[box-shadow,border-color,background-color] duration-200 ${
                  mode === "stable"
                    ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_7%,var(--card))] shadow-[var(--ds-shadow-sm)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))]"
                }`}
              >
                {mode === "stable" && (
                  <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)]" />
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)]">
                    <Shield className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <div className="mb-1 font-semibold text-[var(--foreground)]">
                      稳健模式
                    </div>
                    <div className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                      兼顾利润与防守，适合常规波动
                    </div>
                    <div className="mt-2 font-mono text-[11px] text-[var(--muted-foreground)]">
                      Scale = 0.3
                    </div>
                  </div>
                </div>
              </button>

              {/* 抄底模式卡片 */}
              <button
                type="button"
                onClick={() => onModeChange("aggressive")}
                className={`relative rounded-xl border p-4 text-left transition-[box-shadow,border-color,background-color] duration-200 ${
                  mode === "aggressive"
                    ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_7%,var(--card))] shadow-[var(--ds-shadow-sm)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))]"
                }`}
              >
                {mode === "aggressive" && (
                  <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)]" />
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)]">
                    <Filter className="h-5 w-5 text-[var(--accent-warm)]" />
                  </div>
                  <div>
                    <div className="mb-1 font-semibold text-[var(--foreground)]">
                      抄底模式
                    </div>
                    <div className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                      牺牲频率换取深度防守，适合接飞刀
                    </div>
                    <div className="mt-2 font-mono text-[11px] text-[var(--muted-foreground)]">
                      Scale = 0.6
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 底部状态栏 */}
        <div className="border-t border-[var(--border)] pt-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                dynamicEnabled
                  ? "bg-[var(--accent)]"
                  : "bg-[var(--muted-foreground)]"
              }`}
            />
            <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
              {dynamicEnabled ? (
                <>
                  当前生效逻辑：
                  <span className="font-semibold text-[var(--foreground)]">
                    {" "}
                    加速扩张
                  </span>{" "}
                  （基础: {baseStep}%，系数: {getScaleFactor()}）
                </>
              ) : (
                <>
                  当前生效逻辑：
                  <span className="font-semibold text-[var(--foreground)]">
                    {" "}
                    等差指数模型
                  </span>{" "}
                  （系数: 0）
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
