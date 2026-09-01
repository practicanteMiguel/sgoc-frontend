'use client'

import { useState } from 'react'
import { X, Loader2, Repeat } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { usePrestarDesdeFondoComun } from '@/src/hooks/servicios/use-custodia-herramientas'
import type { FondoComunHerramienta } from '@/src/types/custodia-herramientas.types'
import type { CuadrillaDisponible } from '@/src/types/servicios.types'

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

function hoy() { return new Date().toISOString().split('T')[0] }

export function PrestarFondoComunModal({ servicioId, item, cuadrillas, onClose }: {
  servicioId: string; item: FondoComunHerramienta; cuadrillas: CuadrillaDisponible[]; onClose: () => void
}) {
  const prestar = usePrestarDesdeFondoComun()

  // Las cuadrillas que ya cedieron esta herramienta no se prestan a si
  // mismas: para recuperarla se usa "Devolver" desde su propio modal.
  const cedentesIds = new Set(item.cedido_por.map(c => c.crew_origen.id))
  const opciones = cuadrillas.filter(c => !cedentesIds.has(c.id))

  const [crewId, setCrewId]     = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [fecha, setFecha]       = useState(hoy())
  const [obs, setObs]           = useState('')

  const cantidadNum = parseInt(cantidad, 10) || 0
  const puedeEnviar = !!crewId && cantidadNum > 0 && cantidadNum <= item.cantidad_total

  function submit() {
    if (!puedeEnviar) return
    prestar.mutate(
      { servicioId, herramientaId: item.herramienta.id, crewDestinoId: crewId, cantidad: cantidadNum, fecha, observacion: obs.trim() || undefined },
      { onSuccess: onClose },
    )
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Prestar desde el fondo común</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{item.herramienta.descripcion}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Cuadrilla que la solicita</label>
            {opciones.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>No hay otras cuadrillas en este servicio para prestarle.</p>
            ) : (
              <select value={crewId} onChange={e => setCrewId(e.target.value)} style={{ ...INP, appearance: 'none' as const }}>
                <option value="">Seleccionar cuadrilla...</option>
                {opciones.map(c => <option key={c.id} value={c.id}>{c.name} &middot; {c.field.name}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Cantidad (máx. {item.cantidad_total})</label>
              <input type="number" min={1} max={item.cantidad_total} value={cantidad} onChange={e => setCantidad(e.target.value)} style={INP} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={INP} />
            </div>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Observación (opcional)</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} style={{ ...INP, resize: 'none' as const }} />
          </div>
        </div>

        <div className="px-5 py-4 flex gap-3 justify-end shrink-0"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={!puedeEnviar || prestar.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: 'var(--color-primary)', color: '#fff', opacity: (!puedeEnviar || prestar.isPending) ? 0.6 : 1 }}>
            {prestar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Repeat size={14} />}
            {prestar.isPending ? 'Guardando...' : 'Prestar'}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}
