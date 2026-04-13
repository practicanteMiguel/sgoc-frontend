'use client'

interface Props {
  score: string | number | null
  size?: 'sm' | 'md'
}

export function ScoreCell({ score, size = 'sm' }: Props) {
  const val = score !== null && score !== undefined ? Number(score) : null

  if (val === null || isNaN(val)) {
    return (
      <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
        N/A
      </span>
    )
  }

  const color = val >= 90 ? '#15803d' : val >= 70 ? '#b45309' : '#dc2626'
  const bg    = val >= 90 ? 'rgba(22,163,74,0.12)' : val >= 70 ? 'rgba(202,138,4,0.12)' : 'rgba(220,38,38,0.12)'

  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold tabular-nums ${size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs'}`}
      style={{ background: bg, color }}
    >
      {val.toFixed(0)}%
    </span>
  )
}
