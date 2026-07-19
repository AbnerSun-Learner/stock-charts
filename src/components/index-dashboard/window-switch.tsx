import type { AnalysisWindow } from '@/types/index-dashboard';

const OPTIONS: { value: AnalysisWindow; label: string }[] = [
  { value: 'all', label: '上市以来' }, { value: '10y', label: '近10年' }, { value: '5y', label: '近5年' },
];

export function WindowSwitch({ value, onChange }: { value: AnalysisWindow; onChange: (value: AnalysisWindow) => void }) {
  return <div className="flex rounded-lg bg-[var(--bg-elevated)] p-1" aria-label="数据时间范围">{OPTIONS.map(option => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`rounded-md px-2.5 py-1.5 text-xs transition ${value === option.value ? 'bg-[var(--bg-card)] font-semibold text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{option.label}</button>)}</div>;
}
