'use client'

import { useState } from 'react'
import { X, Loader2, Users, Wrench, Package, Send } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { getInitials } from '@/src/lib/utils'
import { useCrew } from '@/src/hooks/activities/use-crews'
import { CATEGORIA_HERRAMIENTA_LABELS } from '@/src/types/herramientas.types'
import { SolicitarHerramientaModal } from './solicitar-herramienta-modal'
import type { CuadrillaCampoSupervisor } from '@/src/types/solicitudes-herramienta.types'

export function CuadrillaSupervisorModal({ cuadrilla, onClose }: {
  cuadrilla: CuadrillaCampoSupervisor; onClose: () => void
}) {
  const { data: crewDetalle, isLoading: loadingCrew } = useCrew(cuadrilla.id)
  const [showSolicitar, setShowSolicitar] = useState(false)

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>{cuadrilla.name}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-400)' }}>{cuadrilla.field.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity shrink-0" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 flex flex-col gap-4">
          {/* Integrantes */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-400)' }}>
              <Users size={12} /> Integrantes ({loadingCrew ? '...' : crewDetalle?.employees.length ?? 0})
            </p>
            {loadingCrew ? (
              <div className="flex justify-center py-6">
                <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
              </div>
            ) : !crewDetalle || crewDetalle.employees.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin integrantes asignados</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {crewDetalle.employees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}>
                      {getInitials(emp.first_name, emp.last_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>{emp.position}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Herramientas */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-400)' }}>
              <Wrench size={12} /> Herramientas ({cuadrilla.herramientas.length})
            </p>
            {cuadrilla.herramientas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Package size={22} style={{ color: 'var(--color-text-400)' }} />
                <p className="text-xs text-center" style={{ color: 'var(--color-text-400)' }}>Sin herramientas entregadas todavía</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {cuadrilla.herramientas.map(h => (
                  <div key={h.herramienta.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{h.herramienta.descripcion}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>
                        {h.herramienta.codigo} &middot; {CATEGORIA_HERRAMIENTA_LABELS[h.herramienta.categoria]}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)' }}>
                      {h.cantidad} {h.herramienta.unidad}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <button
            onClick={() => setShowSolicitar(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Send size={14} /> Reportar daño / Solicitar herramienta
          </button>
        </div>
      </div>

      {showSolicitar && (
        <SolicitarHerramientaModal
          crewId={cuadrilla.id}
          crewName={cuadrilla.name}
          herramientasCrew={cuadrilla.herramientas}
          onClose={() => setShowSolicitar(false)}
        />
      )}
    </ModalPortal>
  )
}
