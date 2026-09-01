'use client'

import { useState } from 'react'
import { X, Search, Loader2, Users, ChevronLeft, Package } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useCuadrillasDisponibles } from '@/src/hooks/servicios/use-servicios'
import {
  useHistorialEntregasCrewGlobal, useMovimientosBovedaCrewGlobal, useHistorialRetirosCrewGlobal,
} from '@/src/hooks/servicios/use-entregas-herramientas'
import { useHistorialCustodiaCrewGlobal } from '@/src/hooks/servicios/use-custodia-herramientas'
import { HistorialTimelineList, buildTimeline } from './historial-timeline-list'
import { EntregaDetalleModal } from './entrega-detalle-modal'
import type { EntregaHerramientaCrew } from '@/src/types/entregas-herramientas.types'

function HistorialGlobalContent({ crewId, crewName, crewField, onBack }: {
  crewId: string; crewName: string; crewField: string; onBack: () => void
}) {
  const { data: entregas = [], isLoading: loadingEntregas } = useHistorialEntregasCrewGlobal(crewId)
  const { data: movimientosBoveda = [], isLoading: loadingBoveda } = useMovimientosBovedaCrewGlobal(crewId)
  const { data: retiros = [], isLoading: loadingRetiros } = useHistorialRetirosCrewGlobal(crewId)
  const { data: custodia = [], isLoading: loadingCustodia } = useHistorialCustodiaCrewGlobal(crewId)
  const isLoading = loadingEntregas || loadingBoveda || loadingRetiros || loadingCustodia
  const [verEntrega, setVerEntrega] = useState<EntregaHerramientaCrew | null>(null)

  const timeline = buildTimeline(entregas, movimientosBoveda, retiros, custodia)
  const servicios = [...new Set(timeline.map(e => {
    if (e.kind === 'entrega') return e.data.servicio?.nombre
    if (e.kind === 'retiro') return e.data.servicio?.nombre
    return e.data.servicio.nombre
  }).filter((n): n is string => !!n))]

  return (
    <>
      <div className="px-5 py-4 flex items-start gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={onBack} className="p-1 rounded-lg hover:opacity-70 transition-opacity mt-0.5" style={{ color: 'var(--color-text-400)' }}>
          <ChevronLeft size={18} />
        </button>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>{crewName}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
            {crewField}
            {servicios.length > 0 && <span> &middot; Historial en: {servicios.join(', ')}</span>}
          </p>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-2">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
          </div>
        ) : timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Package size={24} style={{ color: 'var(--color-text-400)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>Esta cuadrilla no tiene entregas ni movimientos registrados</p>
          </div>
        ) : (
          <HistorialTimelineList entries={timeline} showServicio onClickEntrega={setVerEntrega} />
        )}
      </div>

      {verEntrega && <EntregaDetalleModal entrega={verEntrega} onClose={() => setVerEntrega(null)} />}
    </>
  )
}

export function BuscarCuadrillaModal({ onClose }: { onClose: () => void }) {
  const { data: cuadrillas = [], isLoading } = useCuadrillasDisponibles()
  const [search, setSearch] = useState('')
  const [crewId, setCrewId] = useState<string | null>(null)

  const filtered = cuadrillas.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.field.name.toLowerCase().includes(q)
  })

  const selected = cuadrillas.find(c => c.id === crewId) ?? null

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {selected ? (
          <HistorialGlobalContent
            crewId={selected.id}
            crewName={selected.name}
            crewField={selected.field.name}
            onBack={() => setCrewId(null)}
          />
        ) : (
          <>
            <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Buscar cuadrilla</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                  Consulta el historial de herramientas de cualquier cuadrilla, esté o no asignada a un servicio
                </p>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity shrink-0" style={{ color: 'var(--color-text-400)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-400)' }} />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre de cuadrilla o campo..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none"
                  style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-1.5">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Users size={22} style={{ color: 'var(--color-text-400)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>Sin resultados</p>
                </div>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCrewId(c.id)}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left w-full hover:opacity-90 transition-opacity"
                    style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{c.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>{c.field.name}</p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={c.servicio
                        ? { background: 'var(--color-primary-muted)', color: 'var(--color-primary)' }
                        : { background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}
                    >
                      {c.servicio ? c.servicio.nombre : 'Sin servicio'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </ModalPortal>
  )
}
