'use client'

import { useState } from 'react'
import { Package, FileText, BarChart2 } from 'lucide-react'
import { useAuthStore } from '@/src/stores/auth.store'
import { InsumosTab } from './insumos/insumos-tab'
import { RequisicionesTab } from './requisiciones/requisiciones-tab'
import { MiSolicitudTab } from './solicitudes/mi-solicitud-tab'
import { InformeComprasTab } from './compras/informe-compras-tab'

type Tab = 'insumos' | 'requisiciones' | 'informe'

const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: 'insumos',       label: 'Insumos',       icon: Package   },
  { id: 'requisiciones', label: 'Requisiciones',  icon: FileText  },
  { id: 'informe',       label: 'Informe',        icon: BarChart2 },
]

export function ConsumablesView() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('insumos')

  const isSupervisor = user?.roles?.includes('supervisor') ?? false

  if (isSupervisor) {
    return (
      <div className="max-w-8xl p-6 sm:p-10 mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2
              className="font-display text-xl font-semibold"
              style={{ color: 'var(--color-secundary)' }}
            >
              Insumos
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              Gestiona tu solicitud mensual y revisa tus requisiciones
            </p>
          </div>
        </div>
        <MiSolicitudTab />
      </div>
    )
  }

  return (
    <div className="max-w-8xl p-6 sm:p-10 mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2
            className="font-display text-xl font-semibold"
            style={{ color: 'var(--color-secundary)' }}
          >
            Gestion de Insumos
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-400)' }}>
            Catalogo de insumos y requisiciones del mes
          </p>
        </div>
      </div>

      <div
        className="flex gap-1 mb-5 p-1 rounded-xl w-fit"
        style={{ background: 'var(--color-surface-2)' }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              activeTab === id
                ? {
                    background: 'var(--color-surface-0)',
                    color:      'var(--color-secundary)',
                    boxShadow:  '0 1px 4px rgba(13,59,88,0.12)',
                  }
                : { color: 'var(--color-text-400)' }
            }
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {activeTab === 'insumos'       && <InsumosTab />}
        {activeTab === 'requisiciones' && <RequisicionesTab />}
        {activeTab === 'informe'       && <InformeComprasTab />}
      </div>
    </div>
  )
}
