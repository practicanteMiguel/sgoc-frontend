'use client'

import { useState } from 'react'
import { InformeComprasTab } from '../consumables/compras/informe-compras-tab'
import { InformeDotacionesTab } from '../consumables/dotaciones/informe-dotaciones-tab'

export function InformesDashboardPanel() {
  const [vista, setVista] = useState<'consumibles' | 'dotacion'>('consumibles')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface-2)' }}>
        {([
          { id: 'consumibles', label: 'Consumibles' },
          { id: 'dotacion',    label: 'Dotacion'     },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setVista(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              vista === t.id
                ? { background: 'var(--color-surface-0)', color: 'var(--color-secundary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                : { color: 'var(--color-text-400)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {vista === 'consumibles'
        ? <InformeComprasTab defaultModo="anual" contexto="dashboard" />
        : <InformeDotacionesTab defaultModo="anual" contexto="dashboard" />}
    </div>
  )
}
