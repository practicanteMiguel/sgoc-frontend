'use client'

import { X, Image as ImageIcon } from 'lucide-react'
import { formatDateShort as formatDate, formatCOP } from '@/src/lib/utils'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { ESTADO_HERRAMIENTA_LABELS, ESTADO_HERRAMIENTA_COLORS } from '@/src/types/entregas-herramientas.types'
import type { EntregaHerramientaCrew } from '@/src/types/entregas-herramientas.types'

export function EntregaDetalleModal({ entrega, onClose }: { entrega: EntregaHerramientaCrew; onClose: () => void }) {
  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Entrega del {formatDate(entrega.fecha_entrega)}</p>
            {entrega.recibido_empleado && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                Recibió {entrega.recibido_empleado.first_name} {entrega.recibido_empleado.last_name}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity shrink-0" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-400)' }}>
              Herramientas entregadas ({entrega.items.length})
            </p>
            <ul className="flex flex-col gap-1.5">
              {entrega.items.map(it => (
                <li key={it.id} className="rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                  style={{ border: `1.5px solid ${ESTADO_HERRAMIENTA_COLORS[it.estado]}` }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                      {it.cantidad_entregada} x {it.herramienta.descripcion}
                      {it.es_adicional && (
                        <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}>
                          Adicional
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                      {it.herramienta.codigo}
                      {it.valor_unitario != null && <span> &middot; {formatCOP(it.valor_unitario)} c/u</span>}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: `${ESTADO_HERRAMIENTA_COLORS[it.estado]}22`, color: ESTADO_HERRAMIENTA_COLORS[it.estado] }}>
                    {ESTADO_HERRAMIENTA_LABELS[it.estado]}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {entrega.observacion && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-400)' }}>Observación</p>
              <p className="text-sm" style={{ color: 'var(--color-text-700)' }}>{entrega.observacion}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-400)' }}>
              <ImageIcon size={12} /> Firma de quien recibió
            </p>
            <div
              className="rounded-lg overflow-hidden flex items-center justify-center p-3"
              style={{ border: '1px solid var(--color-border)', background: '#fff' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entrega.firma_url} alt="Firma de quien recibió" style={{ maxHeight: 140, width: 'auto' }} />
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
