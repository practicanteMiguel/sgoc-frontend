'use client'

import type { DeliverableStatus } from '@/src/types/compliance.types'

const CONFIG: Record<DeliverableStatus, { label: string; bg: string; color: string }> = {
  pendiente:       { label: 'Pendiente',       bg: 'rgba(202,138,4,0.12)',    color: '#b45309' },
  entregado:       { label: 'Entregado',        bg: 'rgba(22,163,74,0.12)',    color: '#15803d' },
  entregado_tarde: { label: 'Entregado tarde',  bg: 'rgba(234,88,12,0.12)',    color: '#c2410c' },
  no_aplica:       { label: 'No aplica',        bg: 'var(--color-surface-2)',  color: 'var(--color-text-400)' },
}

export function StatusBadge({ status }: { status: DeliverableStatus }) {
  const c = CONFIG[status]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  )
}
