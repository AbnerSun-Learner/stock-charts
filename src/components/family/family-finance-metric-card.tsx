'use client';

import { Card } from 'antd';
import { useFamilyAmountVisibility } from '@/components/family/family-amount-visibility';
import { formatCny } from '@/lib/family-finance/format';

export type FamilyFinanceMetricTone = 'primary' | 'neutral' | 'positive' | 'negative';

interface FamilyFinanceMetricCardProps {
  label: string;
  value: number;
  tone: FamilyFinanceMetricTone;
  loading: boolean;
  hint: string;
}

export function FamilyFinanceMetricCard({
  label,
  value,
  tone,
  loading,
  hint,
}: FamilyFinanceMetricCardProps) {
  const amountsVisible = useFamilyAmountVisibility();

  return (
    <Card
      loading={loading}
      className={`family-finance-metric family-finance-metric--${tone}`}
    >
      <div className="family-finance-metric__label">
        <span className="family-finance-metric__marker" aria-hidden />
        {label}
      </div>
      <div className="family-finance-metric__value family-finance-monetary-value">
        {formatCny(value, { visible: amountsVisible })}
      </div>
      <div className="family-finance-metric__hint">{hint}</div>
    </Card>
  );
}
