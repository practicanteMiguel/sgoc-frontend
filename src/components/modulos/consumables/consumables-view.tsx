'use client'

import { useState } from 'react'
import { Package, FileText, BarChart2, HardHat } from 'lucide-react'
import { useAuthStore } from '@/src/stores/auth.store'
import { InsumosTab } from './insumos/insumos-tab'
import { RequisicionesTab } from './requisiciones/requisiciones-tab'
import { MiSolicitudTab } from './solicitudes/mi-solicitud-tab'
import { InformeComprasTab } from './compras/informe-compras-tab'
import { DotacionesView } from './dotaciones/dotaciones-view'

type ModuloTab = 'consumibles' | 'dotacion'
type InsumoTab = 'insumos' | 'requisiciones' | 'informe'

const MODULO_TABS: { id: ModuloTab; label: string; icon: typeof Package }[] = [
  { id: 'consumibles', label: 'Consumibles', icon: Package   },
  { id: 'dotacion',    label: 'Dotacion',    icon: HardHat   },
]

const INSUMO_TABS: { id: InsumoTab; label: string; icon: typeof Package }[] = [
  { id: 'insumos',       label: 'Insumos',       icon: Package   },
  { id: 'requisiciones', label: 'Requisiciones',  icon: FileText  },
  { id: 'informe',       label: 'Informe',        icon: BarChart2 },
]

export function ConsumablesView() {
  const { user } = useAuthStore()
  const [moduloTab, setModuloTab] = useState<ModuloTab>('consumibles')
  const [activeTab,  setActiveTab]  = useState<InsumoTab>('insumos')

  const isSupervisor = user?.roles?.includes('supervisor') ?? false

  function renderTabBar(tabs: { id: string; label: string; icon: typeof Package }[], active: string, onChange: (id: string) => void) {
    return (
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface-2)' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              active === id
                ? { background: 'var(--color-surface-0)', color: 'var(--color-secundary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                : { color: 'var(--color-text-400)' }
            }
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
    )
  }

  const title       = moduloTab === 'dotacion' ? 'Dotacion' : (isSupervisor ? 'Insumos' : 'Gestion de Insumos')
  const subtitle    = moduloTab === 'dotacion'
    ? 'Solicitudes de reposicion de dotacion y EPP'
    : (isSupervisor ? 'Gestiona tu solicitud mensual y revisa tus requisiciones' : 'Catalogo de insumos y requisiciones del mes')

  return (
    <div className="max-w-8xl p-6 sm:p-10 mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-secundary)' }}>
            {title}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-400)' }}>{subtitle}</p>
        </div>
      </div>

      {/* Module selector */}
      {renderTabBar(MODULO_TABS, moduloTab, id => setModuloTab(id as ModuloTab))}

      {/* Consumibles content */}
      {moduloTab === 'consumibles' && (
        isSupervisor
          ? <MiSolicitudTab />
          : (
            <>
              {renderTabBar(INSUMO_TABS, activeTab, id => setActiveTab(id as InsumoTab))}
              <div className="animate-fade-in">
                {activeTab === 'insumos'       && <InsumosTab />}
                {activeTab === 'requisiciones' && <RequisicionesTab />}
                {activeTab === 'informe'       && <InformeComprasTab />}
              </div>
            </>
          )
      )}

      {/* Dotacion content */}
      {moduloTab === 'dotacion' && <DotacionesView />}
    </div>
  )
}
