'use client'

import { useState } from 'react'
import { Wrench, Briefcase, FileBarChart, Inbox } from 'lucide-react'
import { useAuthStore } from '@/src/stores/auth.store'
import { HerramientasTab } from './herramientas-tab'
import { ServiciosTab } from './servicios/servicios-tab'
import { InformeHerramientasTab } from './servicios/informe-herramientas-tab'
import { SolicitudesHerramientaTab } from './solicitudes/solicitudes-herramienta-tab'
import { SupervisorToolsView } from './supervisor/supervisor-tools-view'

type Tab = 'catalogo' | 'servicios' | 'informe' | 'solicitudes'

const TABS: { id: Tab; label: string; icon: typeof Wrench }[] = [
  { id: 'catalogo',    label: 'Catalogo',              icon: Wrench       },
  { id: 'servicios',   label: 'Servicios y Cuadrillas', icon: Briefcase    },
  { id: 'informe',     label: 'Informe',               icon: FileBarChart },
  { id: 'solicitudes', label: 'Solicitudes',           icon: Inbox        },
]

const TITLES: Record<Tab, { title: string; subtitle: string }> = {
  catalogo:    { title: 'Herramientas',           subtitle: 'Catalogo de herramientas: ficha tecnica, valores y estado' },
  servicios:   { title: 'Servicios y Cuadrillas',  subtitle: 'Asigna las cuadrillas de cada campo al servicio que les corresponde' },
  informe:     { title: 'Informe de herramientas', subtitle: 'Licitado vs. entregado por servicio y cuadrilla, con estadísticas y tendencias' },
  solicitudes: { title: 'Solicitudes',             subtitle: 'Herramientas dañadas o nuevas reportadas por los supervisores de campo' },
}

export function ToolsView() {
  const { user } = useAuthStore()
  const roles = user?.roles ?? []
  const isSupervisor = roles.includes('supervisor')

  const [tab, setTab] = useState<Tab>('catalogo')
  const { title, subtitle } = TITLES[tab]

  if (isSupervisor) {
    return (
      <div className="max-w-8xl p-6 sm:p-10 mx-auto animate-fade-in">
        <SupervisorToolsView />
      </div>
    )
  }

  return (
    <div className="max-w-8xl p-6 sm:p-10 mx-auto animate-fade-in">
      <div className="mb-5">
        <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
          {title}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-400)' }}>
          {subtitle}
        </p>
      </div>

      <div className="flex gap-1 mb-5 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--color-surface-2)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0"
            style={
              tab === id
                ? { background: 'var(--color-surface-0)', color: 'var(--color-primary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                : { color: 'var(--color-text-400)' }
            }
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === 'catalogo'    && <HerramientasTab />}
        {tab === 'servicios'   && <ServiciosTab />}
        {tab === 'informe'     && <InformeHerramientasTab />}
        {tab === 'solicitudes' && <SolicitudesHerramientaTab />}
      </div>
    </div>
  )
}
