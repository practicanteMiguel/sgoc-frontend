'use client'

import { useState } from 'react'
import {
  X, Loader2, MapPin, Repeat, Undo2, PackagePlus, Pencil, Save, History,
} from 'lucide-react'
import { formatDateShort as formatDate } from '@/src/lib/utils'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useCuadrillasServicio, useActualizarHerramientaServicio } from '@/src/hooks/servicios/use-servicios'
import {
  useBoveda, useHistorialBoveda, useRegistrarIngresoBoveda,
  usePrestarHerramienta, useReasignarHerramienta, useDevolverHerramienta,
} from '@/src/hooks/servicios/use-boveda-herramientas'
import type { Servicio } from '@/src/types/servicios.types'
import type { MovimientoBoveda } from '@/src/types/boveda-herramientas.types'

const INP: React.CSSProperties = {
  border:       '1.5px solid var(--color-border)',
  background:   'var(--color-surface-0)',
  color:        'var(--color-text-900)',
  borderRadius: 8,
  padding:      '7px 10px',
  fontSize:     13,
  outline:      'none',
  width:        '100%',
}

const TIPO_LABEL: Record<string, string> = {
  INGRESO: 'Ingreso a bóveda',
  BAJA: 'Baja',
}

type PanelActivo = null | 'ingreso' | 'prestamo' | { reasignar: string } | { devolver: string }

function hoy() { return new Date().toISOString().split('T')[0] }

// Combina la DEVOLUCION + PRESTAMO de un mismo traslado_grupo_id en una sola
// linea de "trasladada de X a Y", el resto queda como movimiento individual.
function agruparHistorial(movs: MovimientoBoveda[]) {
  const usados = new Set<string>()
  const filas: { key: string; texto: string; fecha: string }[] = []

  for (const m of movs) {
    if (usados.has(m.id)) continue
    if (m.traslado_grupo_id) {
      const par = movs.find(x => x.id !== m.id && x.traslado_grupo_id === m.traslado_grupo_id)
      if (par) {
        usados.add(m.id)
        usados.add(par.id)
        const devolucion = m.tipo === 'DEVOLUCION' ? m : par
        const prestamo = m.tipo === 'PRESTAMO' ? m : par
        filas.push({
          key: m.traslado_grupo_id,
          texto: `Trasladada de ${devolucion.crew?.name ?? '-'} a ${prestamo.crew?.name ?? '-'} — ${m.cantidad} uds`,
          fecha: m.fecha,
        })
        continue
      }
    }
    usados.add(m.id)
    if (m.tipo === 'PRESTAMO') {
      filas.push({ key: m.id, texto: `Prestada a ${m.crew?.name ?? '-'} — ${m.cantidad} uds`, fecha: m.fecha })
    } else if (m.tipo === 'DEVOLUCION') {
      filas.push({ key: m.id, texto: `Devuelta a bóveda desde ${m.crew?.name ?? '-'} — ${m.cantidad} uds`, fecha: m.fecha })
    } else {
      filas.push({ key: m.id, texto: `${TIPO_LABEL[m.tipo] ?? m.tipo} — ${m.cantidad} uds`, fecha: m.fecha })
    }
  }
  return filas
}

export function BovedaHerramientaModal({ servicio, itemId, onClose }: {
  servicio: Servicio; itemId: string; onClose: () => void
}) {
  const { data: boveda, isLoading } = useBoveda(servicio.id, itemId)
  const { data: historial = [] } = useHistorialBoveda(servicio.id, itemId)
  const { data: cuadrillas = [] } = useCuadrillasServicio(servicio.id)

  const [editandoUbicacion, setEditandoUbicacion] = useState(false)
  const [ubicacionInput, setUbicacionInput] = useState('')
  const [panel, setPanel] = useState<PanelActivo>(null)
  const [cantidadInput, setCantidadInput] = useState('1')
  const [fechaInput, setFechaInput] = useState(hoy())
  const [crewInput, setCrewInput] = useState('')
  const [obsInput, setObsInput] = useState('')

  const actualizarUbicacion = useActualizarHerramientaServicio()
  const ingreso = useRegistrarIngresoBoveda()
  const prestar = usePrestarHerramienta()
  const reasignar = useReasignarHerramienta()
  const devolver = useDevolverHerramienta()

  function abrirPanel(p: PanelActivo) {
    setPanel(p)
    setCantidadInput('1')
    setFechaInput(hoy())
    setCrewInput('')
    setObsInput('')
  }

  function guardarUbicacion() {
    actualizarUbicacion.mutate(
      { servicioId: servicio.id, itemId, ubicacion: ubicacionInput.trim() || null },
      { onSuccess: () => setEditandoUbicacion(false) },
    )
  }

  function submitIngreso() {
    const cantidad = parseInt(cantidadInput, 10)
    if (!cantidad || cantidad <= 0) return
    ingreso.mutate({ servicioId: servicio.id, itemId, cantidad, fecha: fechaInput, observacion: obsInput || undefined },
      { onSuccess: () => setPanel(null) })
  }

  function submitPrestamo() {
    const cantidad = parseInt(cantidadInput, 10)
    if (!cantidad || cantidad <= 0 || !crewInput) return
    prestar.mutate({ servicioId: servicio.id, itemId, crewId: crewInput, cantidad, fecha: fechaInput, observacion: obsInput || undefined },
      { onSuccess: () => setPanel(null) })
  }

  function submitReasignar(crewOrigen: string) {
    const cantidad = parseInt(cantidadInput, 10)
    if (!cantidad || cantidad <= 0 || !crewInput) return
    reasignar.mutate({ servicioId: servicio.id, itemId, crewIdOrigen: crewOrigen, crewIdDestino: crewInput, cantidad, fecha: fechaInput, observacion: obsInput || undefined },
      { onSuccess: () => setPanel(null) })
  }

  function submitDevolver(crewId: string) {
    const cantidad = parseInt(cantidadInput, 10)
    if (!cantidad || cantidad <= 0) return
    devolver.mutate({ servicioId: servicio.id, itemId, crewId, cantidad, fecha: fechaInput, observacion: obsInput || undefined },
      { onSuccess: () => setPanel(null) })
  }

  const filasHistorial = agruparHistorial(historial)

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>{boveda?.herramienta.descripcion ?? '...'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {boveda?.herramienta.codigo} &middot; {servicio.nombre}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        {isLoading || !boveda ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Stock disponible en bóveda</p>
                <p className="text-lg font-bold" style={{ color: 'var(--color-text-900)' }}>{boveda.stock_disponible} <span className="text-xs font-normal">/ {boveda.cantidad_exigida} exigidas</span></p>
              </div>
              <div className="rounded-xl p-3 flex flex-col gap-1" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-400)' }}><MapPin size={11} /> Ubicación</p>
                {editandoUbicacion ? (
                  <div className="flex items-center gap-1">
                    <input value={ubicacionInput} onChange={e => setUbicacionInput(e.target.value)} placeholder="Ej. Bodega campo X" style={{ ...INP, padding: '4px 8px', fontSize: 12 }} />
                    <button onClick={guardarUbicacion} disabled={actualizarUbicacion.isPending} style={{ color: 'var(--color-primary)' }}>
                      <Save size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setUbicacionInput(boveda.ubicacion ?? ''); setEditandoUbicacion(true) }} className="flex items-center gap-1.5 text-left">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>{boveda.ubicacion || 'Sin definir'}</span>
                    <Pencil size={11} style={{ color: 'var(--color-text-400)' }} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => abrirPanel('ingreso')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                <PackagePlus size={13} /> Cargar unidades
              </button>
              <button onClick={() => abrirPanel('prestamo')} disabled={boveda.stock_disponible === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)', opacity: boveda.stock_disponible === 0 ? 0.5 : 1 }}>
                <Repeat size={13} /> Prestar a cuadrilla
              </button>
            </div>

            {panel === 'ingreso' && (
              <div className="rounded-xl p-3 flex flex-col gap-2" style={{ border: '1.5px solid var(--color-primary)', background: 'var(--color-surface-1)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>Cargar unidades a la bóveda</p>
                <div className="flex gap-2">
                  <input type="number" min={1} value={cantidadInput} onChange={e => setCantidadInput(e.target.value)} placeholder="Cantidad" style={{ ...INP, width: 90 }} />
                  <input type="date" value={fechaInput} onChange={e => setFechaInput(e.target.value)} style={INP} />
                </div>
                <input value={obsInput} onChange={e => setObsInput(e.target.value)} placeholder="Observación (opcional)" style={INP} />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setPanel(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--color-text-600)' }}>Cancelar</button>
                  <button onClick={submitIngreso} disabled={ingreso.isPending} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                    {ingreso.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Cargar'}
                  </button>
                </div>
              </div>
            )}

            {panel === 'prestamo' && (
              <div className="rounded-xl p-3 flex flex-col gap-2" style={{ border: '1.5px solid var(--color-primary)', background: 'var(--color-surface-1)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>Prestar a cuadrilla (máx. {boveda.stock_disponible})</p>
                <select value={crewInput} onChange={e => setCrewInput(e.target.value)} style={{ ...INP, appearance: 'none' as const }}>
                  <option value="">Seleccionar cuadrilla...</option>
                  {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.name} &middot; {c.field.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="number" min={1} max={boveda.stock_disponible} value={cantidadInput} onChange={e => setCantidadInput(e.target.value)} placeholder="Cantidad" style={{ ...INP, width: 90 }} />
                  <input type="date" value={fechaInput} onChange={e => setFechaInput(e.target.value)} style={INP} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setPanel(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--color-text-600)' }}>Cancelar</button>
                  <button onClick={submitPrestamo} disabled={prestar.isPending || !crewInput} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                    {prestar.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Prestar'}
                  </button>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-400)' }}>
                En poder de las cuadrillas ({boveda.en_cuadrillas.length})
              </p>
              {boveda.en_cuadrillas.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Ninguna cuadrilla tiene esta herramienta prestada ahora mismo.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {boveda.en_cuadrillas.map(c => (
                    <div key={c.crew_id} className="rounded-xl p-3 flex flex-col gap-2" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{c.crew_name}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>{c.field_name} &middot; {c.cantidad} uds desde {formatDate(c.fecha_ultimo_movimiento)}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => abrirPanel({ reasignar: c.crew_id })}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)' }}>
                            Reasignar
                          </button>
                          <button onClick={() => abrirPanel({ devolver: c.crew_id })}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)' }}>
                            <Undo2 size={12} /> Devolver
                          </button>
                        </div>
                      </div>

                      {panel && typeof panel === 'object' && 'reasignar' in panel && panel.reasignar === c.crew_id && (
                        <div className="rounded-lg p-2.5 flex flex-col gap-2" style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
                          <select value={crewInput} onChange={e => setCrewInput(e.target.value)} style={{ ...INP, appearance: 'none' as const }}>
                            <option value="">Reasignar a...</option>
                            {cuadrillas.filter(cu => cu.id !== c.crew_id).map(cu => (
                              <option key={cu.id} value={cu.id}>{cu.name} &middot; {cu.field.name}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <input type="number" min={1} max={c.cantidad} value={cantidadInput} onChange={e => setCantidadInput(e.target.value)} placeholder="Cantidad" style={{ ...INP, width: 90 }} />
                            <input type="date" value={fechaInput} onChange={e => setFechaInput(e.target.value)} style={INP} />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setPanel(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--color-text-600)' }}>Cancelar</button>
                            <button onClick={() => submitReasignar(c.crew_id)} disabled={reasignar.isPending || !crewInput} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                              {reasignar.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Trasladar'}
                            </button>
                          </div>
                        </div>
                      )}

                      {panel && typeof panel === 'object' && 'devolver' in panel && panel.devolver === c.crew_id && (
                        <div className="rounded-lg p-2.5 flex flex-col gap-2" style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
                          <div className="flex gap-2">
                            <input type="number" min={1} max={c.cantidad} value={cantidadInput} onChange={e => setCantidadInput(e.target.value)} placeholder="Cantidad" style={{ ...INP, width: 90 }} />
                            <input type="date" value={fechaInput} onChange={e => setFechaInput(e.target.value)} style={INP} />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setPanel(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--color-text-600)' }}>Cancelar</button>
                            <button onClick={() => submitDevolver(c.crew_id)} disabled={devolver.isPending} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                              {devolver.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Devolver'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-400)' }}>
                <History size={12} /> Trazabilidad
              </p>
              {filasHistorial.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin movimientos todavía.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {filasHistorial.map(f => (
                    <li key={f.key} className="text-xs flex items-center gap-2" style={{ color: 'var(--color-text-700)' }}>
                      <span style={{ color: 'var(--color-text-400)', minWidth: 78 }}>{formatDate(f.fecha)}</span>
                      {f.texto}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  )
}
