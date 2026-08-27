'use client'

import { useState } from 'react'
import { Wrench, Briefcase, FileBarChart } from 'lucide-react'
import { HerramientasTab } from './herramientas-tab'
import { ServiciosTab } from './servicios/servicios-tab'
import { InformeHerramientasTab } from './servicios/informe-herramientas-tab'

type Tab = 'catalogo' | 'servicios' | 'informe'

const TABS: { id: Tab; label: string; icon: typeof Wrench }[] = [
  { id: 'catalogo',  label: 'Catalogo',              icon: Wrench       },
  { id: 'servicios', label: 'Servicios y Cuadrillas', icon: Briefcase    },
  { id: 'informe',   label: 'Informe',               icon: FileBarChart },
]

const TITLES: Record<Tab, { title: string; subtitle: string }> = {
  catalogo:  { title: 'Herramientas',           subtitle: 'Catalogo de herramientas: ficha tecnica, valores y estado' },
  servicios: { title: 'Servicios y Cuadrillas',  subtitle: 'Asigna las cuadrillas de cada campo al servicio que les corresponde' },
  informe:   { title: 'Informe de herramientas', subtitle: 'Licitado vs. entregado por servicio y cuadrilla, con estadísticas y tendencias' },
}

export function ToolsView() {
  const [tab, setTab] = useState<Tab>('catalogo')
  const { title, subtitle } = TITLES[tab]

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

      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface-2)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
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
        {tab === 'catalogo'  && <HerramientasTab />}
        {tab === 'servicios' && <ServiciosTab />}
        {tab === 'informe'   && <InformeHerramientasTab />}
      </div>
    </div>
  )
}
