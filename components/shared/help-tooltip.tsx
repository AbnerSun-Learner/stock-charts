"use client";

import { Tooltip, type TooltipProps } from "antd";
import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

type HelpTooltipSize = "sm" | "md";
type HelpTooltipVariant = "default" | "rich";

export const TOOLTIP_Z_INDEX = 10000;

interface HelpTooltipProps {
  title: ReactNode;
  size?: HelpTooltipSize;
  variant?: HelpTooltipVariant;
  placement?: TooltipProps["placement"];
  maxWidth?: number | string;
  className?: string;
}

const SIZE_CLASS: Record<HelpTooltipSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
};

export function HelpTooltip({
  title,
  size = "sm",
  variant = "default",
  placement = "top",
  maxWidth = "16rem",
  className = "",
}: HelpTooltipProps) {
  const rootClassName =
    variant === "rich"
      ? "ds-help-tooltip ds-help-tooltip--rich"
      : "ds-help-tooltip";

  return (
    <Tooltip
      title={title}
      placement={placement}
      color="#ffffff"
      getPopupContainer={() =>
        (document.querySelector('.grid-shell') as HTMLElement) ?? document.body
      }
      overlayClassName={rootClassName}
      overlayInnerStyle={{
        maxWidth,
        backgroundColor: '#ffffff',
        color: 'var(--foreground)',
        zIndex: TOOLTIP_Z_INDEX,
      }}
      overlayStyle={{ zIndex: TOOLTIP_Z_INDEX }}
    >
      <span
        className="inline-flex shrink-0 cursor-help align-middle"
        tabIndex={0}
        aria-label="查看说明"
      >
        <HelpCircle
          className={`${SIZE_CLASS[size]} text-[var(--muted-foreground)] opacity-60 transition-opacity hover:text-[var(--accent)] hover:opacity-100 ${className}`}
          strokeWidth={1.5}
        />
      </span>
    </Tooltip>
  );
}
