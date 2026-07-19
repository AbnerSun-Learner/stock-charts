import type { ReactNode } from 'react';

export function PanelShell({ title, eyebrow, action, children }: { title: string; eyebrow?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
        <div>
          {eyebrow ? <p className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">{eyebrow}</p> : null}
          <h2 className="m-0 font-[var(--font-display)] text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function PanelState({ message, tone = 'empty' }: { message: string; tone?: 'empty' | 'error' | 'loading' }) {
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`flex min-h-40 items-center justify-center rounded-xl border border-dashed px-6 text-center text-sm ${tone === 'error' ? 'border-[var(--loss)] text-[var(--loss)]' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'}`}>{message}</div>;
}
