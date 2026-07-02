"use client";

import { AlertCircle } from "lucide-react";

interface ErrorAlertProps {
  errors: string[];
}

export function ErrorAlert({ errors }: ErrorAlertProps) {
  if (errors.length === 0) return null;

  return (
    <div
      className="mb-8 rounded-xl border border-[color-mix(in_srgb,var(--loss)_35%,var(--border))] bg-[color-mix(in_srgb,var(--loss)_6%,var(--card))] p-5 shadow-[var(--ds-shadow-sm)] backdrop-blur-sm"
      role="alert"
    >
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 shrink-0 text-[var(--loss)]" />
        <span className="font-semibold text-[var(--foreground)]">
          参数校验未通过
        </span>
      </div>
      <ul className="list-inside list-disc space-y-1.5 text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_88%,var(--loss))] marker:text-[var(--loss)]">
        {errors.map((error, i) => (
          <li key={i}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
