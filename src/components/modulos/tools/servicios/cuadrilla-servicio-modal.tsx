'use client'

import { useState } from 'react'
import { X, Loader2, Users, Wrench, PackagePlus, Package, UserMinus, Repeat } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { getInitials } from '@/src/lib/utils'
import { useCrew } from '@/src/hooks/activities/use-crews'
import { usePermissions } from '@/src/hooks/auth/use-permissions'
import {
  useHistorialEntregasCrew, useMovimientosBovedaCrew, useHistorialRetirosCrew,
} from '@/src/hooks/servicios/use-entregas-herramientas'
import { useHistorialCustodiaCrew } from '@/src/hooks/servicios/use-custodia-herramientas'
import { EntregarHerramientasModal } from './entregar-herramientas-modal'
import { EntregaDetalleModal } from './entrega-detalle-modal'
import { RetirarHerramientaModal } from './retirar-herramienta-modal'
import { CustodiaHerramientaModal } from './custodia-herramienta-modal'
import { QuitarCuadrillaModal } from './quitar-cuadrilla-modal'
import { HistorialTimelineList, buildTimeline } from './historial-timeline-list'
import type { Servicio, CuadrillaDisponible } from '@/src/types/servicios.types'
import type { EntregaHerramientaCrew } from '@/src/types/entregas-herramientas.types'

export function CuadrillaServicioModal({ servicio, crew, onClose }: {
  servicio: Servicio; crew: CuadrillaDisponible; onClose: () => void
}) {
  const { canEdit } = usePermissions('tools')
  const { data: crewDetalle, isLoading: loadingCrew } = useCrew(crew.id)
  const { data: entregas = [], isLoading: loadingEntregas } = useHistorialEntregasCrew(servicio.id, crew.id)
  const { data: movimientosBoveda = [], isLoading: loadingBoveda } = useMovimientosBovedaCrew(servicio.id, crew.id)
  const { data: retiros = [], isLoading: loadingRetiros } = useHistorialRetirosCrew(servicio.id, crew.id)
  const { data: custodia = [], isLoading: loadingCustodia } = useHistorialCustodiaCrew(servicio.id, crew.id)
  const isLoadingHistorial = loadingEntregas || loadingBoveda || loadingRetiros || loadingCustodia

  const [showEntrega, setShowEntrega] = useState(false)
  const [showRetirar, setShowRetirar] = useState(false)
  const [showCustodia, setShowCustodia] = useState(false)
  const [showQuitar, setShowQuitar] = useState(false)
  const [verEntrega, setVerEntrega] = useState<EntregaHerramientaCrew | null>(null)

  const timeline = buildTimeline(entregas, movimientosBoveda, retiros, custodia)

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
              {crew.name}
              {crew.is_soldadura && (
                <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}>
                  Soldadura
                </span>
              )}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-400)' }}>
              {crew.field.name} &middot; {servicio.nombre}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity shrink-0" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* Columna izquierda: integrantes + quitar del servicio */}
          <div className="md:w-64 shrink-0 flex flex-col" style={{ borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
            <div className="px-4 py-3 flex items-center gap-2 shrink-0" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <Users size={14} style={{ color: 'var(--color-text-400)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-700)' }}>
                {loadingCrew ? '...' : `${crewDetalle?.employees.length ?? 0} integrante${crewDetalle?.employees.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 px-3 py-3 flex flex-col gap-1.5 max-h-40 md:max-h-65">
              {loadingCrew ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                </div>
              ) : !crewDetalle || crewDetalle.employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Wrench size={20} style={{ color: 'var(--color-text-400)' }} />
                  <p className="text-xs text-center" style={{ color: 'var(--color-text-400)' }}>Sin integrantes asignados</p>
                </div>
              ) : (
                crewDetalle.employees.map(emp => (
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
                ))
              )}
            </div>

            {canEdit && (
              <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => setShowQuitar(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                >
                  <UserMinus size={13} /> Quitar del servicio
                </button>
              </div>
            )}
          </div>

          {/* Columna derecha: acciones + historial */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <div className="px-5 py-3 flex gap-2 flex-wrap shrink-0" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <button
                onClick={() => setShowEntrega(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                <PackagePlus size={13} /> Entregar herramientas
              </button>
              <button
                onClick={() => setShowRetirar(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)' }}
              >
                <Wrench size={13} /> Sacar de funcionamiento
              </button>
              <button
                onClick={() => setShowCustodia(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)' }}
              >
                <Repeat size={13} /> Prestar / Ceder
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-2">
              {isLoadingHistorial ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                </div>
              ) : timeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Package size={24} style={{ color: 'var(--color-text-400)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>Sin entregas registradas todavía</p>
                </div>
              ) : (
                <HistorialTimelineList entries={timeline} onClickEntrega={setVerEntrega} />
              )}
            </div>
          </div>
        </div>
      </div>

      {showEntrega && <EntregarHerramientasModal servicio={servicio} crewId={crew.id} onClose={() => setShowEntrega(false)} />}
      {showRetirar && <RetirarHerramientaModal servicioId={servicio.id} crewId={crew.id} onClose={() => setShowRetirar(false)} />}
      {showCustodia && <CustodiaHerramientaModal servicioId={servicio.id} crewId={crew.id} onClose={() => setShowCustodia(false)} />}
      {verEntrega && <EntregaDetalleModal entrega={verEntrega} onClose={() => setVerEntrega(null)} />}
      {showQuitar && <QuitarCuadrillaModal servicioId={servicio.id} crew={crew} onClose={() => setShowQuitar(false)} />}
    </ModalPortal>
  )
}
