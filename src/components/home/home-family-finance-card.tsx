'use client';

import { Button, Card } from 'antd';

export interface HomeFamilyFinanceCardProps {
  onAction: () => void;
}

const FAMILY_ASSET_ICON = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M3.75 10.25 12 4l8.25 6.25M5.5 9.25V20h13V9.25M9 20v-5.5h6V20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ARROW_ICON = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M3.5 8h9m-3.25-3.25L12.5 8l-3.25 3.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 首页家庭资产入口卡片。
 *
 * 独立于通用 HomeToolCard，避免特色布局和主题样式影响投研工具卡片。
 */
export function HomeFamilyFinanceCard({ onAction }: HomeFamilyFinanceCardProps) {
  return (
    <Card
      variant="borderless"
      className="home-family-finance-card opacity-0 animate-[cardFadeIn_0.4s_var(--ease-out-expo)_both]"
      style={{ animationDelay: '0.08s' }}
    >
      <div className="home-family-finance-card__content">
        <div className="home-family-finance-card__copy">
          <div className="home-family-finance-card__eyebrow">
            <span className="home-family-finance-card__icon">{FAMILY_ASSET_ICON}</span>
            <span>家庭资产</span>
          </div>

          <h3 className="home-family-finance-card__title">让全家的资产脉络，一眼清晰</h3>
          <p className="home-family-finance-card__description">
            统一盘点成员资产、家庭负债与保单保障，用一张总览掌握家庭财务全貌。
          </p>

          <ul className="home-family-finance-card__features" aria-label="家庭资产功能">
            <li>资产负债</li>
            <li>四笔钱</li>
            <li>保单保障</li>
          </ul>

          <Button
            type="primary"
            size="large"
            className="home-family-finance-card__action"
            onClick={onAction}
          >
            查看家庭资产
            {ARROW_ICON}
          </Button>
        </div>

        <div className="home-family-finance-card__visual" aria-hidden>
          <div className="home-family-finance-card__visual-header">
            <span>家庭资产全景</span>
            <span className="home-family-finance-card__status">统一归集</span>
          </div>

          <div className="home-family-finance-card__asset-row home-family-finance-card__asset-row--primary">
            <span className="home-family-finance-card__asset-icon">资</span>
            <span className="home-family-finance-card__asset-label">
              <strong>成员资产</strong>
              <small>按家庭成员清晰归集</small>
            </span>
            <span className="home-family-finance-card__asset-mark" />
          </div>

          <div className="home-family-finance-card__asset-row">
            <span className="home-family-finance-card__asset-icon home-family-finance-card__asset-icon--neutral">
              债
            </span>
            <span className="home-family-finance-card__asset-label">
              <strong>家庭负债</strong>
              <small>和资产放在一起审视</small>
            </span>
            <span className="home-family-finance-card__asset-mark home-family-finance-card__asset-mark--short" />
          </div>

          <div className="home-family-finance-card__summary">
            <span>资产记账</span>
            <span>结构分析</span>
            <span>保障覆盖</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
