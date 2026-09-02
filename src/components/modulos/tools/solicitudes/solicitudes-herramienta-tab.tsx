'use client'

import { useState } from 'react'
import { Loader2, Inbox, X, CheckCircle2 } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { usePermissions } from '@/src/hooks/auth/use-permissions'
import { useSolicitudesHerramienta, useAtenderSolicitudHerramienta } from '@/src/hooks/servicios/use-solicitudes-herramienta'
import { formatDateShort as formatDate, formatCOP } from '@/src/lib/utils'
import {
  TIPO_SOLICITUD_LABELS, ESTADO_SOLICITUD_LABELS, ESTADO_SOLICITUD_COLORS,
} from '@/src/types/solicitudes-herramienta.types'
import type { SolicitudHerramienta, EstadoSolicitudHerramienta } from '@/src/types/solicitudes-herramienta.types'

const INP: React.CSSProperties = {
  border:       '1.5px solid var(--color-border)',
  background:   'var(--color-surface-0)',
  color:        'var(--color-text-900)',
  borderRadius: 8,
  padding:      '8px 10px',
  fontSize:     13,
  outline:      'none',
  width:        '100%',
}

function AtenderModal({ solicitud, onClose }: { solicitud: SolicitudHerramienta; onClose: () => void }) {
  const [respuesta, setRespuesta] = useState('')
  const atender = useAtenderSolicitudHerramienta()

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Detalle de la solicitud</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="rounded-lg p-3" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>{solicitud.herramienta.descripcion}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {solicitud.herramienta.codigo} &middot; {solicitud.herramienta.unidad}
              {solicitud.herramienta.valor_unitario != null && <span> &middot; {formatCOP(solicitud.herramienta.valor_unitario)}</span>}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-600)' }}>
              {solicitud.crew.name} &middot; {TIPO_SOLICITUD_LABELS[solicitud.tipo]}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-400)' }}>Motivo</p>
            <p className="text-sm" style={{ color: 'var(--color-text-900)' }}>{solicitud.motivo}</p>
          </div>

          {solicitud.estado === 'ATENDIDA' ? (
            <div className="rounded-lg p-3" style={{ background: '#16a34a11', border: '1px solid #16a34a44' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#16a34a' }}>Respuesta</p>
              <p className="text-sm" style={{ color: 'var(--color-text-900)' }}>{solicitud.respuesta || 'Sin observación'}</p>
            </div>
          ) : (
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Respuesta (opcional)</label>
              <textarea
                value={respuesta}
                onChange={e => setRespuesta(e.target.value)}
                rows={3}
                placeholder="Ej. Se entregó reemplazo el..."
                style={{ ...INP, resize: 'none' as const }}
              />
            </div>
          )}
        </div>

        <div className="px-5 py-4 flex gap-3 justify-end shrink-0" style={{ background: 'var(--color-surface-1)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium shrink-0"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
            Cerrar
          </button>
          {solicitud.estado !== 'ATENDIDA' && (
            <button
              onClick={() => atender.mutate({ id: solicitud.id, respuesta: respuesta.trim() || undefined }, { onSuccess: onClose })}
              disabled={atender.isPending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity shrink-0"
              style={{ background: 'var(--color-primary)', color: '#fff', opacity: atender.isPending ? 0.6 : 1 }}
            >
              {atender.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {atender.isPending ? 'Guardando...' : 'Marcar como atendida'}
            </button>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

export function SolicitudesHerramientaTab() {
  const { canEdit } = usePermissions('tools')
  const [estadoFilter, setEstadoFilter] = useState<EstadoSolicitudHerramienta | ''>('')
  const [verSolicitud, setVerSolicitud] = useState<SolicitudHerramienta | null>(null)

  const { data: solicitudes = [], isLoading } = useSolicitudesHerramienta({ estado: estadoFilter || undefined })

  const th = "text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
  const td = "px-4 py-3 text-sm whitespace-nowrap"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 p-1 rounded-lg w-fit overflow-x-auto" style={{ background: 'var(--color-surface-2)' }}>
        {([
          { id: '' as const, label: 'Todas' },
          { id: 'PENDIENTE' as const, label: 'Pendientes' },
          { id: 'ATENDIDA' as const, label: 'Atendidas' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setEstadoFilter(id)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0"
            style={estadoFilter === id
              ? { background: 'var(--color-surface-0)', color: 'var(--color-primary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
              : { color: 'var(--color-text-400)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}>
          <Inbox size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin solicitudes</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Cuadrilla', 'Campo', 'Herramienta', 'Tipo', 'Motivo', 'Estado', 'Fecha', ''].map(h => (
                    <th key={h} className={th} style={{ color: 'var(--color-text-400)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {solicitudes.map(s => (
                  <tr
                    key={s.id}
                    className={canEdit ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
                    style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}
                    onClick={() => canEdit && setVerSolicitud(s)}
                  >
                    <td className={td} style={{ color: 'var(--color-text-900)', fontWeight: 500 }}>{s.crew.name}</td>
                    <td className={td} style={{ color: 'var(--color-text-600)' }}>{s.crew.field?.name ?? '-'}</td>
                    <td className={td} style={{ color: 'var(--color-text-900)' }}>{s.herramienta.descripcion}</td>
                    <td className={td} style={{ color: 'var(--color-text-600)' }}>{TIPO_SOLICITUD_LABELS[s.tipo]}</td>
                    <td className="px-4 py-3 text-sm max-w-64 truncate" style={{ color: 'var(--color-text-600)' }}>{s.motivo}</td>
                    <td className={td}>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${ESTADO_SOLICITUD_COLORS[s.estado]}22`, color: ESTADO_SOLICITUD_COLORS[s.estado] }}>
                        {ESTADO_SOLICITUD_LABELS[s.estado]}
                      </span>
                    </td>
                    <td className={td} style={{ color: 'var(--color-text-400)' }}>{formatDate(s.created_at)}</td>
                    <td className={td}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {verSolicitud && <AtenderModal solicitud={verSolicitud} onClose={() => setVerSolicitud(null)} />}
    </div>
  )
}
