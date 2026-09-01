'use client'

import { useState } from 'react'
import { Loader2, Warehouse, MapPin, Pencil, Save, Repeat } from 'lucide-react'
import { useActualizarHerramientaServicio } from '@/src/hooks/servicios/use-servicios'
import { useFondoComunServicio } from '@/src/hooks/servicios/use-custodia-herramientas'
import { PrestarFondoComunModal } from './prestar-fondo-comun-modal'
import type { CuadrillaDisponible } from '@/src/types/servicios.types'
import type { FondoComunHerramienta } from '@/src/types/custodia-herramientas.types'

const INP: React.CSSProperties = {
  border:       '1.5px solid var(--color-border)',
  background:   'var(--color-surface-0)',
  color:        'var(--color-text-900)',
  borderRadius: 8,
  padding:      '6px 8px',
  fontSize:     12,
  outline:      'none',
  width:        '100%',
}

export function FondoComunServicio({ servicioId, cuadrillas, canEdit }: {
  servicioId: string; cuadrillas: CuadrillaDisponible[]; canEdit: boolean | undefined
}) {
  const { data: fondoComun = [], isLoading } = useFondoComunServicio(servicioId)
  const actualizarUbicacion = useActualizarHerramientaServicio()

  const [editandoUbicacionDe, setEditandoUbicacionDe] = useState<string | null>(null)
  const [ubicacionInput, setUbicacionInput] = useState('')
  const [prestarItem, setPrestarItem] = useState<FondoComunHerramienta | null>(null)

  function abrirEdicionUbicacion(herramientaId: string, actual: string | null) {
    setEditandoUbicacionDe(herramientaId)
    setUbicacionInput(actual ?? '')
  }

  function guardarUbicacion(itemId: string) {
    actualizarUbicacion.mutate(
      { servicioId, itemId, ubicacion: ubicacionInput.trim() || null },
      { onSuccess: () => setEditandoUbicacionDe(null) },
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
        <Warehouse size={14} style={{ color: 'var(--color-text-400)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
          Fondo común ({fondoComun.length})
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : fondoComun.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Warehouse size={22} style={{ color: 'var(--color-text-400)' }} />
          <p className="text-xs text-center" style={{ color: 'var(--color-text-400)' }}>
            Ninguna cuadrilla ha cedido herramientas exigidas al fondo común todavía
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {fondoComun.map((f) => (
            <div key={f.herramienta.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                  {f.herramienta.descripcion} <span className="font-normal" style={{ color: 'var(--color-text-400)' }}>&middot; {f.cantidad_total} {f.herramienta.unidad}</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                  Cedida por {f.cedido_por.map(c => `${c.crew_origen.name} (${c.cantidad})`).join(', ')}
                </p>
                {editandoUbicacionDe === f.herramienta.id ? (
                  <div className="flex items-center gap-1 mt-1.5">
                    <input
                      value={ubicacionInput}
                      onChange={e => setUbicacionInput(e.target.value)}
                      placeholder="Ej. Bodega campo X"
                      style={{ ...INP, maxWidth: 220 }}
                      autoFocus
                    />
                    <button onClick={() => f.servicio_herramienta_id && guardarUbicacion(f.servicio_herramienta_id)} disabled={actualizarUbicacion.isPending} style={{ color: 'var(--color-primary)' }}>
                      <Save size={14} />
                    </button>
                  </div>
                ) : canEdit && (
                  <button onClick={() => abrirEdicionUbicacion(f.herramienta.id, f.ubicacion)} className="flex items-center gap-1 mt-1.5 text-left">
                    <MapPin size={11} style={{ color: 'var(--color-text-400)' }} />
                    <span className="text-xs" style={{ color: f.ubicacion ? 'var(--color-text-700)' : 'var(--color-text-400)' }}>
                      {f.ubicacion || 'Sin ubicación definida'}
                    </span>
                    <Pencil size={10} style={{ color: 'var(--color-text-400)' }} />
                  </button>
                )}
              </div>
              {canEdit && (
                <button
                  onClick={() => setPrestarItem(f)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)' }}
                >
                  <Repeat size={12} /> Prestar a cuadrilla
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {prestarItem && (
        <PrestarFondoComunModal
          servicioId={servicioId}
          item={prestarItem}
          cuadrillas={cuadrillas}
          onClose={() => setPrestarItem(null)}
        />
      )}
    </div>
  )
}
