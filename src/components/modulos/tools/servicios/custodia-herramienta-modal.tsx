'use client'

import { useState } from 'react'
import { X, Loader2, Repeat, Undo2, PackageCheck, Warehouse } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useCuadrillasServicio } from '@/src/hooks/servicios/use-servicios'
import {
  useCustodiaCrew, useCustodiaRecibida,
  useRegistrarPrestamoCustodia, useRegistrarCesionBoveda, useRegistrarDevolucionCustodia,
} from '@/src/hooks/servicios/use-custodia-herramientas'
import type { CustodiaHerramientaCrew } from '@/src/types/custodia-herramientas.types'

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

type PanelActivo = null | { herramientaId: string } | { devolver: { herramientaId: string; crewDestinoId: string | null } }

function hoy() { return new Date().toISOString().split('T')[0] }

export function CustodiaHerramientaModal({ servicioId, crewId, onClose }: {
  servicioId: string; crewId: string; onClose: () => void
}) {
  const { data: custodia = [], isLoading } = useCustodiaCrew(servicioId, crewId)
  const { data: recibida = [] } = useCustodiaRecibida(servicioId, crewId)
  const { data: cuadrillas = [] } = useCuadrillasServicio(servicioId)

  const prestar   = useRegistrarPrestamoCustodia()
  const ceder     = useRegistrarCesionBoveda()
  const devolver  = useRegistrarDevolucionCustodia()
  const guardando = prestar.isPending || ceder.isPending || devolver.isPending

  const [panel, setPanel]           = useState<PanelActivo>(null)
  const [destinoTipo, setDestinoTipo] = useState<'CUADRILLA' | 'BOVEDA'>('CUADRILLA')
  const [crewInput, setCrewInput]   = useState('')
  const [cantidadInput, setCantidadInput] = useState('1')
  const [fechaInput, setFechaInput] = useState(hoy())
  const [obsInput, setObsInput]     = useState('')

  function abrirPanel(p: PanelActivo) {
    setPanel(p)
    setDestinoTipo('CUADRILLA')
    setCrewInput('')
    setCantidadInput('1')
    setFechaInput(hoy())
    setObsInput('')
  }

  function submitPrestarOCeder(item: CustodiaHerramientaCrew) {
    const cantidad = parseInt(cantidadInput, 10)
    if (!cantidad || cantidad <= 0) return
    if (destinoTipo === 'CUADRILLA') {
      if (!crewInput) return
      prestar.mutate(
        { servicioId, crewId, herramientaId: item.herramienta.id, crewDestinoId: crewInput, cantidad, fecha: fechaInput, observacion: obsInput || undefined },
        { onSuccess: () => setPanel(null) },
      )
    } else {
      ceder.mutate(
        { servicioId, crewId, herramientaId: item.herramienta.id, cantidad, fecha: fechaInput, observacion: obsInput || undefined },
        { onSuccess: () => setPanel(null) },
      )
    }
  }

  function submitDevolver(herramientaId: string, crewDestinoId: string | null) {
    const cantidad = parseInt(cantidadInput, 10)
    if (!cantidad || cantidad <= 0) return
    devolver.mutate(
      { servicioId, crewId, herramientaId, crewDestinoId, cantidad, fecha: fechaInput, observacion: obsInput || undefined },
      { onSuccess: () => setPanel(null) },
    )
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Prestar / Ceder herramientas</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              No afecta lo exigido ya entregado a esta cuadrilla, solo deja registro de dónde está.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity shrink-0" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
            {recibida.length > 0 && (
              <div className="rounded-xl p-3" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-400)' }}>
                  Recibido en préstamo de otras cuadrillas
                </p>
                <div className="flex flex-col gap-1.5">
                  {recibida.map((r, i) => (
                    <p key={i} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-700)' }}>
                      <PackageCheck size={12} style={{ color: 'var(--color-text-400)' }} />
                      {r.cantidad} x {r.herramienta.descripcion} &middot; de {r.crew_origen?.name ?? 'una cuadrilla'}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {custodia.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Repeat size={22} style={{ color: 'var(--color-text-400)' }} />
                <p className="text-sm text-center" style={{ color: 'var(--color-text-400)' }}>
                  Esta cuadrilla no tiene herramientas exigidas entregadas para prestar o ceder
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {custodia.map(item => (
                  <div key={item.herramienta.id} className="rounded-xl p-3 flex flex-col gap-2" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{item.herramienta.descripcion}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>
                          Entregado {item.cantidad_entregada} &middot; en poder {item.cantidad_en_poder}
                        </p>
                      </div>
                      <button
                        onClick={() => abrirPanel({ herramientaId: item.herramienta.id })}
                        disabled={item.cantidad_en_poder === 0}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 hover:opacity-80 transition-opacity"
                        style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)', opacity: item.cantidad_en_poder === 0 ? 0.5 : 1 }}
                      >
                        <Repeat size={12} /> Prestar / Ceder
                      </button>
                    </div>

                    {panel && 'herramientaId' in panel && panel.herramientaId === item.herramienta.id && (
                      <div className="rounded-lg p-2.5 flex flex-col gap-2" style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
                        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                          <button
                            onClick={() => setDestinoTipo('CUADRILLA')}
                            className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all"
                            style={destinoTipo === 'CUADRILLA' ? { background: 'var(--color-surface-0)', color: 'var(--color-primary)' } : { color: 'var(--color-text-400)' }}
                          >
                            Otra cuadrilla
                          </button>
                          <button
                            onClick={() => setDestinoTipo('BOVEDA')}
                            className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all"
                            style={destinoTipo === 'BOVEDA' ? { background: 'var(--color-surface-0)', color: 'var(--color-primary)' } : { color: 'var(--color-text-400)' }}
                          >
                            Fondo común del servicio
                          </button>
                        </div>

                        {destinoTipo === 'CUADRILLA' && (
                          <select value={crewInput} onChange={e => setCrewInput(e.target.value)} style={{ ...INP, appearance: 'none' as const }}>
                            <option value="">Seleccionar cuadrilla...</option>
                            {cuadrillas.filter(c => c.id !== crewId).map(c => (
                              <option key={c.id} value={c.id}>{c.name} &middot; {c.field.name}</option>
                            ))}
                          </select>
                        )}

                        <div className="flex gap-2">
                          <input type="number" min={1} max={item.cantidad_en_poder} value={cantidadInput} onChange={e => setCantidadInput(e.target.value)} placeholder="Cantidad" style={{ ...INP, width: 90 }} />
                          <input type="date" value={fechaInput} onChange={e => setFechaInput(e.target.value)} style={INP} />
                        </div>
                        <input value={obsInput} onChange={e => setObsInput(e.target.value)} placeholder="Observación (opcional)" style={INP} />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setPanel(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--color-text-600)' }}>Cancelar</button>
                          <button
                            onClick={() => submitPrestarOCeder(item)}
                            disabled={guardando || (destinoTipo === 'CUADRILLA' && !crewInput)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: 'var(--color-primary)', color: '#fff' }}
                          >
                            {guardando ? <Loader2 size={13} className="animate-spin" /> : (destinoTipo === 'CUADRILLA' ? 'Prestar' : 'Ceder')}
                          </button>
                        </div>
                      </div>
                    )}

                    {item.prestado_o_cedido.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                        {item.prestado_o_cedido.map((d, i) => {
                          const key = `${item.herramienta.id}-${d.crew_destino_id ?? 'boveda'}`
                          const estaDevolviendo = panel && 'devolver' in panel
                            && panel.devolver.herramientaId === item.herramienta.id
                            && panel.devolver.crewDestinoId === d.crew_destino_id
                          return (
                            <div key={i} className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-600)' }}>
                                  {d.destino.tipo === 'BOVEDA'
                                    ? <Warehouse size={12} style={{ color: 'var(--color-text-400)' }} />
                                    : <Repeat size={12} style={{ color: 'var(--color-text-400)' }} />}
                                  {d.cantidad} x {d.destino.tipo === 'BOVEDA' ? 'en el fondo común' : `prestado a ${d.destino.crew?.name ?? '-'}`}
                                </p>
                                <button
                                  onClick={() => abrirPanel({ devolver: { herramientaId: item.herramienta.id, crewDestinoId: d.crew_destino_id } })}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)' }}
                                >
                                  <Undo2 size={11} /> Devolver
                                </button>
                              </div>

                              {estaDevolviendo && (
                                <div className="rounded-lg p-2.5 flex flex-col gap-2" style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }} key={key}>
                                  <div className="flex gap-2">
                                    <input type="number" min={1} max={d.cantidad} value={cantidadInput} onChange={e => setCantidadInput(e.target.value)} placeholder="Cantidad" style={{ ...INP, width: 90 }} />
                                    <input type="date" value={fechaInput} onChange={e => setFechaInput(e.target.value)} style={INP} />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button onClick={() => setPanel(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--color-text-600)' }}>Cancelar</button>
                                    <button
                                      onClick={() => submitDevolver(item.herramienta.id, d.crew_destino_id)}
                                      disabled={guardando}
                                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                      style={{ background: 'var(--color-primary)', color: '#fff' }}
                                    >
                                      {guardando ? <Loader2 size={13} className="animate-spin" /> : 'Devolver'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ModalPortal>
  )
}
