'use client'

import { useState } from 'react'
import { X, Loader2, Search, Wrench, Repeat, Trash2, CheckCircle2, Plus } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useHerramientas } from '@/src/hooks/herramientas/use-herramientas'
import { useAsignarHerramientasServicio } from '@/src/hooks/servicios/use-servicios'
import { CATEGORIA_HERRAMIENTA_LABELS } from '@/src/types/herramientas.types'
import type { Herramienta } from '@/src/types/herramientas.types'
import type { Servicio } from '@/src/types/servicios.types'

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

interface Seleccion {
  herramienta: Herramienta
  cantidad_exigida: string
  es_rotativa: boolean
}

export function AsignarHerramientasModal({ servicio, existingIds = [], onClose }: {
  servicio: Servicio; existingIds?: string[]; onClose: () => void
}) {
  const [search,     setSearch]     = useState('')
  const [seleccion,  setSeleccion]  = useState<Map<string, Seleccion>>(new Map())

  // El catalogo suele tener menos de 500 herramientas activas; se trae todo de
  // una vez (sin pasar el texto de busqueda al backend) y el buscador filtra
  // en memoria sobre ese listado completo. Si el "search" fuera al backend,
  // cada tecla dispararia una peticion nueva y con catalogos grandes se
  // agota rapido el limite de peticiones por minuto.
  const { data, isLoading } = useHerramientas({ activo: true, limit: 500 })
  const asignar = useAsignarHerramientasServicio()

  const excluidos = new Set(existingIds)
  const q = search.trim().toLowerCase()
  const opciones = (data?.data ?? [])
    .filter(h => !excluidos.has(h.id))
    .filter(h => !q || h.descripcion.toLowerCase().includes(q) || h.codigo.toLowerCase().includes(q))

  // El panel de seleccionadas guarda su propia copia de cada herramienta para
  // no depender del resultado (filtrado por busqueda) del catalogo: si no,
  // al buscar, las ya seleccionadas que no calzan con el texto desaparecian.
  function agregar(h: Herramienta) {
    setSeleccion(prev => {
      const next = new Map(prev)
      if (!next.has(h.id)) next.set(h.id, { herramienta: h, cantidad_exigida: '1', es_rotativa: false })
      return next
    })
  }

  function quitar(id: string) {
    setSeleccion(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }

  function setCantidad(id: string, cantidad_exigida: string) {
    setSeleccion(prev => {
      const next = new Map(prev)
      const item = next.get(id)
      if (item) next.set(id, { ...item, cantidad_exigida })
      return next
    })
  }

  function toggleRotativa(id: string) {
    setSeleccion(prev => {
      const next = new Map(prev)
      const item = next.get(id)
      if (item) next.set(id, { ...item, es_rotativa: !item.es_rotativa })
      return next
    })
  }

  const items = Array.from(seleccion.entries()).map(([id, s]) => ({
    herramienta_id: id,
    cantidad_exigida: parseInt(s.cantidad_exigida, 10),
    es_rotativa: s.es_rotativa,
  }))
  const puedeGuardar = items.length > 0 && items.every(i => Number.isFinite(i.cantidad_exigida) && i.cantidad_exigida > 0)

  function submit() {
    if (!puedeGuardar) return
    asignar.mutate({ servicioId: servicio.id, items }, { onSuccess: onClose })
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Agregar herramientas exigidas</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{servicio.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {/* Catalogo */}
          <div className="w-1/2 flex flex-col min-h-0" style={{ borderRight: '1px solid var(--color-border)' }}>
            <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-400)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar herramienta..."
                  style={{ ...INP, paddingLeft: 30 }}
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-3 py-2 flex flex-col gap-1">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                </div>
              ) : opciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Wrench size={22} style={{ color: 'var(--color-text-400)' }} />
                  <p className="text-xs text-center" style={{ color: 'var(--color-text-400)' }}>No hay herramientas disponibles</p>
                </div>
              ) : (
                opciones.map(h => {
                  const yaSeleccionada = seleccion.has(h.id)
                  return (
                    <button
                      key={h.id}
                      onClick={() => agregar(h)}
                      disabled={yaSeleccionada}
                      className="flex items-center gap-2 p-2.5 rounded-lg text-left transition-all w-full"
                      style={{
                        background: yaSeleccionada ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'var(--color-surface-1)',
                        border: `1.5px solid ${yaSeleccionada ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        opacity: yaSeleccionada ? 0.7 : 1,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{h.descripcion}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>
                          {h.codigo} &middot; {CATEGORIA_HERRAMIENTA_LABELS[h.categoria]}
                        </p>
                        {h.marca_modelo && (
                          <p className="text-xs truncate font-medium" style={{ color: 'var(--color-secondary)' }}>
                            {h.marca_modelo}
                          </p>
                        )}
                      </div>
                      {yaSeleccionada ? (
                        <CheckCircle2 size={15} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
                      ) : (
                        <Plus size={15} className="shrink-0" style={{ color: 'var(--color-text-400)' }} />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Seleccion */}
          <div className="w-1/2 flex flex-col min-h-0">
            <div className="px-4 py-3 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>
                Seleccionadas ({items.length})
              </span>
            </div>

            <div className="overflow-y-auto flex-1 px-3 py-2 flex flex-col gap-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 px-4 text-center">
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                    Elige herramientas del catalogo a la izquierda para irlas agregando aqui
                  </p>
                </div>
              ) : (
                Array.from(seleccion.entries()).map(([id, s]) => {
                  const h = s.herramienta
                  return (
                    <div key={id} className="p-2.5 rounded-lg flex flex-col gap-2" style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{h.descripcion}</p>
                          {h.marca_modelo && (
                            <p className="text-xs truncate" style={{ color: 'var(--color-secondary)' }}>{h.marca_modelo}</p>
                          )}
                        </div>
                        <button onClick={() => quitar(id)} className="shrink-0 hover:opacity-70 transition-opacity" style={{ color: 'var(--color-danger)' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={s.cantidad_exigida}
                          onChange={e => setCantidad(id, e.target.value)}
                          placeholder="Cantidad"
                          style={{ ...INP, padding: '5px 8px', fontSize: 12, width: 80 }}
                        />
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--color-text-600)' }}>
                          <input type="checkbox" checked={s.es_rotativa} onChange={() => toggleRotativa(id)} />
                          <Repeat size={11} /> Rotativa
                        </label>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 flex gap-3 justify-end shrink-0" style={{ background: 'var(--color-surface-1)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={asignar.isPending || !puedeGuardar}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: 'var(--color-primary)', color: '#fff', opacity: asignar.isPending || !puedeGuardar ? 0.6 : 1 }}>
            {asignar.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {asignar.isPending ? 'Agregando...' : `Agregar ${items.length || ''} herramienta${items.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}
