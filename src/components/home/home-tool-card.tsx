'use client';

import { Card, Button } from 'antd';
import type { ReactNode } from 'react';

export interface HomeToolCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  animationDelay?: string;
  coming?: boolean;
  onAction?: () => void;
  actionLabel?: string;
}

/**
 * 首页工具卡片（家庭财务与投研工具共用样式）。
 */
export function HomeToolCard({
  title,
  description,
  icon,
  animationDelay = '0.08s',
  coming = false,
  onAction,
  actionLabel = '立即使用',
}: HomeToolCardProps) {
  return (
    <Card
      variant="borderless"
      className="home-tool-card group relative opacity-0 animate-[cardFadeIn_0.4s_var(--ease-out-expo)_both]"
      style={{ animationDelay }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--accent)] to-[var(--success)] opacity-0 transition-opacity duration-[0.25s] group-hover:opacity-100" />
      <div className="w-14 h-14 flex items-center justify-center mx-auto mb-5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent)] transition-all duration-[0.25s] group-hover:bg-[var(--accent-soft)] group-hover:border-[var(--accent-glow)]">
        {icon}
      </div>
      <h2 className="font-[var(--font-display)] text-[1.0625rem] font-semibold text-[var(--text-primary)] m-0 mb-2.5 text-center">
        {title}
      </h2>
      <p className="text-[0.8125rem] text-[var(--text-muted)] leading-relaxed m-0 mb-6 flex-1 text-center">
        {description}
      </p>
      {coming ? (
        <Button size="middle" disabled className="home-tool-card-btn">
          即将上线
        </Button>
      ) : (
        <Button size="middle" onClick={onAction} className="home-tool-card-btn">
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
