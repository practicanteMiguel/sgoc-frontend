'use client'

import { useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight, Package, PackageCheck, Clock } from 'lucide-react'
import { useMisSolicitudes, useSolicitudRequisiciones } from '@/src/hooks/consumables/use-solicitudes'
import { CATEGORIA_LABELS, ESTADO_LABELS } from '@/src/types/consumables.types'
import type { EstadoRQ } from '@/src/types/consumables.types'
import { RecepcionModal } from './recepcion-modal'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const BADGE_COLORS: Record<string, string> = {
  ABIERTA:          '#6b7280',
  COMPLETADA:       '#22c55e',
  APROBADA:         '#3b82f6',
  PEDIDO_REALIZADO: '#f59e0b',
  EN_BODEGA:        '#0891b2',
  ENTREGADO:        '#16a34a',
}

function EstadoBadge({ estado }: { estado: string }) {
  const color = BADGE_COLORS[estado] ?? '#6b7280'
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `${color}22`, color }}
    >
      {ESTADO_LABELS[estado as EstadoRQ] ?? estado}
    </span>
  )
}

const ESTADOS_RECIBIBLES = new Set(['PEDIDO_REALIZADO', 'EN_BODEGA'])

function SolicitudRQBlock({ solicitudId, lugar, lote }: { solicitudId: string; lugar: string; lote: number }) {
  const { data: rqs = [], isLoading } = useSolicitudRequisiciones(solicitudId)
  const [recibiendoId, setRecibiendoId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
      </div>
    )
  }

  if (rqs.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-6 rounded-xl text-xs"
        style={{ border: '1px dashed var(--color-border)', color: 'var(--color-text-200)' }}
      >
        Sin requisiciones generadas
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {rqs.map((rq) => (
          <div
            key={rq.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl flex-wrap"
            style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold" style={{ color: 'var(--color-text-900)' }}>
                  RQ #{rq.numero_rq}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
                >
                  {CATEGORIA_LABELS[rq.categoria]}
                </span>
                <EstadoBadge estado={rq.estado} />
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                {lugar} &middot; CC {lote}
              </p>
            </div>

            {ESTADOS_RECIBIBLES.has(rq.estado) && (
              <button
                onClick={() => setRecibiendoId(rq.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                <Package size={13} />
                Recibir insumos
              </button>
            )}

            {rq.estado === 'ENTREGADO' && (
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(22,163,74,0.1)', color: '#15803d' }}
              >
                <PackageCheck size={13} />
                Entregado
              </div>
            )}

            {!ESTADOS_RECIBIBLES.has(rq.estado) && rq.estado !== 'ENTREGADO' && (
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}
              >
                <Clock size={13} />
                En proceso
              </div>
            )}
          </div>
        ))}
      </div>

      {recibiendoId && (
        <RecepcionModal rqId={recibiendoId} onClose={() => setRecibiendoId(null)} />
      )}
    </>
  )
}

export function SupervisorRQsView() {
  const now  = new Date()
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())

  function adjustPeriod(delta: number) {
    let m = mes + delta, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  const { data: solicitudes = [], isLoading } = useMisSolicitudes(mes, anio)
  const generadas = solicitudes.filter((s) => s.estado === 'GENERADA')

  return (
    <div className="flex flex-col gap-5">
      {/* Period selector */}
      <div
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 w-fit"
        style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)' }}
      >
        <button
          onClick={() => adjustPeriod(-1)}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-text-400)' }}
        >
          <ChevronLeft size={14} />
        </button>
        <span
          className="text-sm font-semibold px-2 text-center"
          style={{ color: 'var(--color-text-900)', minWidth: 144 }}
        >
          {MESES[mes - 1]} {anio}
        </span>
        <button
          onClick={() => adjustPeriod(1)}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-text-400)' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : generadas.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <Package size={28} className="mb-3" style={{ color: 'var(--color-border)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin requisiciones para este periodo</p>
          <p className="text-xs mt-1 text-center" style={{ color: 'var(--color-text-400)' }}>
            Las requisiciones apareceran aqui una vez el encargado las genere desde tu solicitud
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {generadas.map((sol) => (
            <div key={sol.id} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-200)' }}>
                {sol.lugar} - CC {sol.lote}
              </p>
              <SolicitudRQBlock solicitudId={sol.id} lugar={sol.lugar} lote={sol.lote} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
