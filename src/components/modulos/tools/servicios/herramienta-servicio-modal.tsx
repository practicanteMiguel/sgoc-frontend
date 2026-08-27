'use client'

import { useState } from 'react'
import { X, Loader2, Repeat, Save } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useActualizarHerramientaServicio } from '@/src/hooks/servicios/use-servicios'
import { CATEGORIA_HERRAMIENTA_LABELS } from '@/src/types/herramientas.types'
import type { Servicio, ServicioHerramienta } from '@/src/types/servicios.types'

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

export function HerramientaServicioModal({ servicio, item, onClose }: {
  servicio: Servicio; item: ServicioHerramienta; onClose: () => void
}) {
  const [cantidadExigida, setCantidadExigida] = useState(String(item.cantidad_exigida))
  const [esRotativa,      setEsRotativa]      = useState(item.es_rotativa)

  const actualizar = useActualizarHerramientaServicio()

  const cantidad = parseInt(cantidadExigida, 10)
  const puedeGuardar = Number.isFinite(cantidad) && cantidad > 0

  function submit() {
    if (!puedeGuardar) return
    actualizar.mutate(
      { servicioId: servicio.id, itemId: item.id, cantidad_exigida: cantidad, es_rotativa: esRotativa },
      { onSuccess: onClose },
    )
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Editar herramienta exigida</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{servicio.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)' }}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{item.herramienta.descripcion}</p>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>
                {item.herramienta.codigo} &middot; {CATEGORIA_HERRAMIENTA_LABELS[item.herramienta.categoria]}
              </p>
              {item.herramienta.marca_modelo && (
                <p className="text-xs truncate font-medium" style={{ color: 'var(--color-secondary)' }}>
                  {item.herramienta.marca_modelo}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-600)' }}>
              Cantidad exigida por contrato
            </label>
            <input
              type="number"
              min={1}
              value={cantidadExigida}
              onChange={e => setCantidadExigida(e.target.value)}
              placeholder="0"
              style={INP}
            />
          </div>

          <label
            className="flex items-start gap-3 p-3 rounded-lg cursor-pointer"
            style={{
              background: esRotativa ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'var(--color-surface-1)',
              border: `1.5px solid ${esRotativa ? 'var(--color-primary)' : 'var(--color-border)'}`,
            }}
          >
            <input
              type="checkbox"
              checked={esRotativa}
              onChange={e => setEsRotativa(e.target.checked)}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-900)' }}>
                <Repeat size={13} /> Herramienta rotativa / compartida
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
                No se exige una unidad por cada cuadrilla. El servicio debe tener disponible la cantidad
                indicada como un fondo comun que se presta y rota entre las cuadrillas que la requieran.
              </p>
            </div>
          </label>
        </div>

        <div className="px-5 py-4 flex gap-3 justify-end shrink-0"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={actualizar.isPending || !puedeGuardar}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: 'var(--color-primary)', color: '#fff', opacity: actualizar.isPending || !puedeGuardar ? 0.6 : 1 }}>
            {actualizar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {actualizar.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}
