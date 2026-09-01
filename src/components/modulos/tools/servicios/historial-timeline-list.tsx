'use client'

import { Package, Repeat, Wrench, ChevronRight, ArrowLeftRight } from 'lucide-react'
import { formatDateShort as formatDate } from '@/src/lib/utils'
import type { EntregaHerramientaCrew, RetiroHerramientaCrew } from '@/src/types/entregas-herramientas.types'
import type { MovimientoBovedaCrewHistorial } from '@/src/types/boveda-herramientas.types'
import type { MovimientoCustodiaHistorial } from '@/src/types/custodia-herramientas.types'

const ESTADO_MOV_LABELS: Record<string, string> = { ENTREGADA: 'Entregada', DEVUELTA: 'Devuelta' }
const ESTADO_MOV_COLORS: Record<string, string> = { ENTREGADA: '#16a34a', DEVUELTA: '#6b7280' }
const RETIRO_COLOR = '#ef4444'
const CUSTODIA_COLOR = '#8b5cf6'

export type TimelineEntry =
  | { kind: 'entrega'; fecha: string; data: EntregaHerramientaCrew }
  | { kind: 'boveda'; fecha: string; data: MovimientoBovedaCrewHistorial }
  | { kind: 'retiro'; fecha: string; data: RetiroHerramientaCrew }
  | { kind: 'custodia'; fecha: string; data: MovimientoCustodiaHistorial }

export function buildTimeline(
  entregas: EntregaHerramientaCrew[],
  movimientosBoveda: MovimientoBovedaCrewHistorial[],
  retiros: RetiroHerramientaCrew[],
  movimientosCustodia: MovimientoCustodiaHistorial[] = [],
): TimelineEntry[] {
  return [
    ...entregas.map((e): TimelineEntry => ({ kind: 'entrega', fecha: e.fecha_entrega, data: e })),
    ...movimientosBoveda.map((m): TimelineEntry => ({ kind: 'boveda', fecha: m.fecha, data: m })),
    ...retiros.map((r): TimelineEntry => ({ kind: 'retiro', fecha: r.fecha, data: r })),
    ...movimientosCustodia.map((c): TimelineEntry => ({ kind: 'custodia', fecha: c.fecha, data: c })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha))
}

function textoCustodia(m: MovimientoCustodiaHistorial): string {
  if (m.rol === 'ORIGEN') {
    if (m.tipo === 'PRESTAMO') return m.de_fondo_comun ? `Trasladada del fondo común a ${m.crew_destino?.name ?? '-'}` : `Prestada a ${m.crew_destino?.name ?? '-'}`
    if (m.tipo === 'BOVEDA') return 'Cedida al fondo común'
    return `Devuelta por ${m.crew_destino?.name ?? 'el fondo común'}`
  }
  if (m.tipo === 'PRESTAMO') return m.de_fondo_comun ? `Recibida del fondo común (cedida por ${m.crew_origen.name})` : `Recibida en préstamo de ${m.crew_origen.name}`
  return `Devuelta a ${m.crew_origen.name}`
}

function ServicioBadge({ nombre }: { nombre: string }) {
  return (
    <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-primary-muted)', color: 'var(--color-primary)' }}>
      {nombre}
    </span>
  )
}

export function HistorialTimelineList({ entries, showServicio, onClickEntrega }: {
  entries: TimelineEntry[]
  showServicio?: boolean
  onClickEntrega?: (entrega: EntregaHerramientaCrew) => void
}) {
  return (
    <>
      {entries.map(entry => {
        if (entry.kind === 'entrega') {
          return (
            <button
              key={`e-${entry.data.id}`}
              onClick={() => onClickEntrega?.(entry.data)}
              disabled={!onClickEntrega}
              className="rounded-xl p-3 flex items-center justify-between gap-3 text-left w-full hover:opacity-90 transition-opacity"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Package size={15} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                    Entrega de {entry.data.items.length} herramienta{entry.data.items.length !== 1 ? 's' : ''}
                    {showServicio && entry.data.servicio && <ServicioBadge nombre={entry.data.servicio.nombre} />}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-400)' }}>
                    {formatDate(entry.data.fecha_entrega)}
                    {entry.data.recibido_empleado && (
                      <span> &middot; Recibió {entry.data.recibido_empleado.first_name} {entry.data.recibido_empleado.last_name}</span>
                    )}
                  </p>
                </div>
              </div>
              {onClickEntrega && <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--color-text-400)' }} />}
            </button>
          )
        }
        if (entry.kind === 'retiro') {
          return (
            <div key={`r-${entry.data.id}`} className="rounded-xl p-3 flex items-center justify-between gap-3"
              style={{ border: `1.5px solid ${RETIRO_COLOR}`, background: 'var(--color-surface-1)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <Wrench size={15} className="shrink-0" style={{ color: RETIRO_COLOR }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                    {entry.data.cantidad} x {entry.data.herramienta.descripcion}
                    {showServicio && entry.data.servicio && <ServicioBadge nombre={entry.data.servicio.nombre} />}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-400)' }}>
                    {formatDate(entry.data.fecha)}
                    {entry.data.motivo && <span> &middot; {entry.data.motivo}</span>}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: `${RETIRO_COLOR}22`, color: RETIRO_COLOR }}>
                Fuera de funcionamiento
              </span>
            </div>
          )
        }
        if (entry.kind === 'custodia') {
          return (
            <div key={`c-${entry.data.id}`} className="rounded-xl p-3 flex items-center justify-between gap-3"
              style={{ border: `1.5px solid ${CUSTODIA_COLOR}`, background: 'var(--color-surface-1)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <ArrowLeftRight size={15} className="shrink-0" style={{ color: CUSTODIA_COLOR }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                    {entry.data.cantidad} x {entry.data.herramienta.descripcion}
                    {showServicio && <ServicioBadge nombre={entry.data.servicio.nombre} />}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-400)' }}>
                    {formatDate(entry.data.fecha)} &middot; {textoCustodia(entry.data)}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: `${CUSTODIA_COLOR}22`, color: CUSTODIA_COLOR }}>
                {entry.data.rol === 'ORIGEN' ? 'Cedido' : 'Prestado'}
              </span>
            </div>
          )
        }
        return (
          <div key={`b-${entry.data.id}`} className="rounded-xl p-3 flex items-center justify-between gap-3"
            style={{ border: `1.5px solid ${ESTADO_MOV_COLORS[entry.data.estado]}`, background: 'var(--color-surface-1)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <Repeat size={15} className="shrink-0" style={{ color: ESTADO_MOV_COLORS[entry.data.estado] }} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                  {entry.data.cantidad} x {entry.data.herramienta.descripcion}
                  <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}>
                    Rotativa
                  </span>
                  {showServicio && <ServicioBadge nombre={entry.data.servicio.nombre} />}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-400)' }}>
                  {formatDate(entry.data.fecha)}
                  {entry.data.tipo === 'PRESTAMO' && entry.data.es_traslado && entry.data.otra_cuadrilla && (
                    <span> &middot; Trasladada desde {entry.data.otra_cuadrilla.name}</span>
                  )}
                  {entry.data.tipo === 'DEVOLUCION' && entry.data.es_traslado && entry.data.otra_cuadrilla && (
                    <span> &middot; Trasladada a {entry.data.otra_cuadrilla.name}</span>
                  )}
                  {entry.data.tipo === 'DEVOLUCION' && !entry.data.es_traslado && (
                    <span> &middot; Devuelta a bóveda</span>
                  )}
                  {entry.data.tipo === 'PRESTAMO' && !entry.data.es_traslado && (
                    <span> &middot; Prestada desde bóveda</span>
                  )}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: `${ESTADO_MOV_COLORS[entry.data.estado]}22`, color: ESTADO_MOV_COLORS[entry.data.estado] }}>
              {ESTADO_MOV_LABELS[entry.data.estado]}
            </span>
          </div>
        )
      })}
    </>
  )
}
