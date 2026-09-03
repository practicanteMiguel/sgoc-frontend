'use client';

interface SummaryCardProps {
  label: string;
  value: string;
  color: string;
  sub?:  string;
}

export function SummaryCard({ label, value, color, sub }: SummaryCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
    >
      <span className="text-xs" style={{ color: 'var(--color-text-200)' }}>{label}</span>
      <span className="text-sm font-bold" style={{ color }}>{value}</span>
      {sub && <span className="text-xs font-medium" style={{ color }}>{sub}</span>}
    </div>
  );
}
