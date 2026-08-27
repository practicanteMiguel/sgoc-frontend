'use client'

import { useState } from 'react'
import {
  X, Loader2, PenLine, Plus, Trash2, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useCrew } from '@/src/hooks/activities/use-crews'
import { useHerramientas } from '@/src/hooks/herramientas/use-herramientas'
import { useResumenHerramientasCrew, useRegistrarEntregaHerramientas } from '@/src/hooks/servicios/use-entregas-herramientas'
import { useSignatureCanvas } from '@/src/components/modulos/consumables/dotaciones/entrega-shared'
import type { Servicio } from '@/src/types/servicios.types'
import type { RegistrarEntregaHerramientasItemDto, EstadoHerramientaEntrega } from '@/src/types/entregas-herramientas.types'
import { ESTADOS_HERRAMIENTA, ESTADO_HERRAMIENTA_LABELS, ESTADO_HERRAMIENTA_COLORS } from '@/src/types/entregas-herramientas.types'

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

const VERDE = '#16a34a'
const ROJO  = '#ef4444'
const AZUL  = '#3b82f6'

function colorSemaforo(total: number, exigida: number): string {
  if (total === exigida) return VERDE
  if (total < exigida) return ROJO
  return AZUL
}

interface AdicionalRow {
  _id: string
  herramienta_id: string
  cantidad: string
  estado: EstadoHerramientaEntrega
}

function EstadoPicker({ value, onChange }: { value: EstadoHerramientaEntrega; onChange: (v: EstadoHerramientaEntrega) => void }) {
  return (
    <div className="flex gap-1 shrink-0">
      {ESTADOS_HERRAMIENTA.map(estado => {
        const active = value === estado
        const color  = ESTADO_HERRAMIENTA_COLORS[estado]
        return (
          <button
            key={estado}
            type="button"
            title={ESTADO_HERRAMIENTA_LABELS[estado]}
            onClick={() => onChange(estado)}
            className="w-7 h-7 rounded-md text-xs font-bold transition-all"
            style={active
              ? { background: `${color}22`, color, border: `1.5px solid ${color}` }
              : { background: 'var(--color-surface-2)', color: 'var(--color-text-400)', border: '1.5px solid transparent' }}
          >
            {ESTADO_HERRAMIENTA_LABELS[estado][0]}
          </button>
        )
      })}
    </div>
  )
}

export function EntregarHerramientasModal({ servicio, crewId, onClose }: {
  servicio: Servicio; crewId: string; onClose: () => void
}) {
  const { data: crew } = useCrew(crewId)
  const { data: resumen, isLoading: loadingResumen } = useResumenHerramientasCrew(servicio.id, crewId)
  const { data: catalogo } = useHerramientas({ activo: true, limit: 500 })
  const registrar = useRegistrarEntregaHerramientas()

  const [fase, setFase] = useState<'seleccion' | 'resumen' | 'firma'>('seleccion')
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [recibidoId, setRecibidoId] = useState('')
  const [observacion, setObservacion] = useState('')
  const [entregarAhora, setEntregarAhora] = useState<Map<string, string>>(new Map())
  const [estadoExigidas, setEstadoExigidas] = useState<Map<string, EstadoHerramientaEntrega>>(new Map())
  const [adicionales, setAdicionales] = useState<AdicionalRow[]>([])
  const { canvasRef, hasStrokes, setHasStrokes, startDraw, draw, endDraw, limpiar } = useSignatureCanvas(fase === 'firma')

  const exigidas = resumen?.exigidas ?? []
  const idsExigidas = new Set(exigidas.map(e => e.herramienta.id))

  function opcionesAdicionalPara(rowId: string) {
    const usadasPorOtras = new Set(
      adicionales.filter(a => a._id !== rowId && a.herramienta_id).map(a => a.herramienta_id),
    )
    return (catalogo?.data ?? []).filter(h => !idsExigidas.has(h.id) && !usadasPorOtras.has(h.id))
  }

  function setCantidadExigida(herramientaId: string, val: string) {
    setEntregarAhora(prev => {
      const next = new Map(prev)
      next.set(herramientaId, val)
      return next
    })
  }

  function setEstadoExigida(herramientaId: string, estado: EstadoHerramientaEntrega) {
    setEstadoExigidas(prev => {
      const next = new Map(prev)
      next.set(herramientaId, estado)
      return next
    })
  }

  function agregarAdicional() {
    setAdicionales(prev => [...prev, { _id: crypto.randomUUID(), herramienta_id: '', cantidad: '1', estado: 'NUEVO' }])
  }

  function quitarAdicional(id: string) {
    setAdicionales(prev => prev.filter(a => a._id !== id))
  }

  function setAdicionalField(id: string, field: 'herramienta_id' | 'cantidad', val: string) {
    setAdicionales(prev => prev.map(a => a._id === id ? { ...a, [field]: val } : a))
  }

  function setAdicionalEstado(id: string, estado: EstadoHerramientaEntrega) {
    setAdicionales(prev => prev.map(a => a._id === id ? { ...a, estado } : a))
  }

  const itemsAEnviar: RegistrarEntregaHerramientasItemDto[] = [
    ...exigidas
      .map(e => ({ herramienta_id: e.herramienta.id, cantidad: parseInt(entregarAhora.get(e.herramienta.id) ?? '0', 10) || 0 }))
      .filter(e => e.cantidad > 0)
      .map(e => ({
        herramienta_id: e.herramienta_id,
        cantidad_entregada: e.cantidad,
        estado: estadoExigidas.get(e.herramienta_id) ?? 'NUEVO',
        es_adicional: false,
      })),
    ...adicionales
      .filter(a => a.herramienta_id && (parseInt(a.cantidad, 10) || 0) > 0)
      .map(a => ({ herramienta_id: a.herramienta_id, cantidad_entregada: parseInt(a.cantidad, 10) || 0, estado: a.estado, es_adicional: true })),
  ]

  const faltantes = exigidas
    .map(e => {
      const ahora = parseInt(entregarAhora.get(e.herramienta.id) ?? '0', 10) || 0
      const total = e.cantidad_entregada_acumulada + ahora
      return { ...e, total, falta: e.cantidad_exigida - total }
    })
    .filter(e => e.falta > 0)

  function irAResumen() {
    if (!recibidoId) { return }
    if (itemsAEnviar.length === 0) { return }
    setFase('resumen')
  }

  function handleConfirmar() {
    if (!canvasRef.current || !hasStrokes) return
    canvasRef.current.toBlob(blob => {
      if (!blob) return
      registrar.mutate({
        servicioId: servicio.id,
        crewId,
        fechaEntrega: fecha,
        recibidoEmpleadoId: recibidoId,
        observacion: observacion.trim() || undefined,
        items: itemsAEnviar,
        firmaBlob: blob,
      }, { onSuccess: () => onClose() })
    }, 'image/png')
  }

  const recibido = crew?.employees.find(e => e.id === recibidoId)

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Entregar herramientas</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {crew?.name ?? '...'} &middot; {servicio.nombre}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        {fase === 'seleccion' && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Recibe</label>
                  <select value={recibidoId} onChange={e => setRecibidoId(e.target.value)} style={{ ...INP, appearance: 'none' as const }}>
                    <option value="">Seleccionar integrante...</option>
                    {crew?.employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} &middot; {emp.position}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Fecha de entrega</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={INP} />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-400)' }}>
                  Herramientas exigidas
                </p>
                {loadingResumen ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                  </div>
                ) : exigidas.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Este servicio no tiene herramientas exigidas (no rotativas).</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {exigidas.map(e => {
                      const ahora = entregarAhora.get(e.herramienta.id) ?? ''
                      const total = e.cantidad_entregada_acumulada + (parseInt(ahora, 10) || 0)
                      const color = colorSemaforo(total, e.cantidad_exigida)
                      const estado = estadoExigidas.get(e.herramienta.id) ?? 'NUEVO'
                      return (
                        <div key={e.herramienta.id} className="rounded-xl p-3 flex flex-col gap-2"
                          style={{ border: `1.5px solid ${color}`, background: 'var(--color-surface-1)' }}>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{e.herramienta.descripcion}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>
                              {e.herramienta.codigo}
                              {e.herramienta.marca_modelo && <span> &middot; {e.herramienta.marca_modelo}</span>}
                              {' '}&middot; Ya entregado: {e.cantidad_entregada_acumulada} de {e.cantidad_exigida}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <EstadoPicker value={estado} onChange={v => setEstadoExigida(e.herramienta.id, v)} />
                            <input
                              type="number"
                              min={0}
                              value={ahora}
                              onChange={ev => setCantidadExigida(e.herramienta.id, ev.target.value)}
                              placeholder="0"
                              style={{ ...INP, width: 72, textAlign: 'center' as const }}
                            />
                            <span className="text-xs font-bold shrink-0" style={{ color, minWidth: 56, textAlign: 'right' as const }}>
                              {total} / {e.cantidad_exigida}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-400)' }}>
                    Herramientas adicionales
                  </p>
                  <button onClick={agregarAdicional}
                    className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--color-primary)' }}>
                    <Plus size={13} /> Agregar
                  </button>
                </div>
                {adicionales.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                    Herramientas que no estaban exigidas por contrato pero se entregan de todas formas.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {adicionales.map(a => (
                      <div key={a._id} className="rounded-xl p-2.5 flex items-center gap-2"
                        style={{ border: `1.5px solid ${ESTADO_HERRAMIENTA_COLORS[a.estado]}`, background: 'var(--color-surface-1)' }}>
                        <select
                          value={a.herramienta_id}
                          onChange={e => setAdicionalField(a._id, 'herramienta_id', e.target.value)}
                          className="flex-1"
                          style={{ ...INP, appearance: 'none' as const }}
                        >
                          <option value="">Seleccionar herramienta...</option>
                          {opcionesAdicionalPara(a._id).map(h => (
                            <option key={h.id} value={h.id}>{h.codigo} &middot; {h.descripcion}</option>
                          ))}
                        </select>
                        <EstadoPicker value={a.estado} onChange={v => setAdicionalEstado(a._id, v)} />
                        <input
                          type="number"
                          min={1}
                          value={a.cantidad}
                          onChange={e => setAdicionalField(a._id, 'cantidad', e.target.value)}
                          style={{ ...INP, width: 72 }}
                        />
                        <button onClick={() => quitarAdicional(a._id)} className="shrink-0 hover:opacity-70 transition-opacity" style={{ color: 'var(--color-danger)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Observación (opcional)</label>
                <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={2} style={{ ...INP, resize: 'none' as const }} />
              </div>
            </div>

            <div className="px-5 py-4 flex gap-3 justify-end shrink-0" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
                Cancelar
              </button>
              <button onClick={irAResumen} disabled={!recibidoId || itemsAEnviar.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
                style={{ background: 'var(--color-primary)', color: '#fff', opacity: (!recibidoId || itemsAEnviar.length === 0) ? 0.6 : 1 }}>
                Continuar
              </button>
            </div>
          </>
        )}

        {fase === 'resumen' && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                Esto es lo que va a recibir {recibido ? `${recibido.first_name} ${recibido.last_name}` : 'el receptor'}:
              </p>

              {faltantes.length > 0 && (
                <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: '#fef3c7', border: '1.5px solid #f59e0b' }}>
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: '#b45309' }} />
                  <div className="text-xs" style={{ color: '#92400e' }}>
                    <p className="font-semibold">Aún queda faltando de lo exigido:</p>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {faltantes.map(f => (
                        <li key={f.herramienta.id}>{f.herramienta.descripcion}: faltan {f.falta} {f.herramienta.unidad}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {itemsAEnviar.map(item => {
                  const h = [...exigidas.map(e => e.herramienta), ...(catalogo?.data ?? [])].find(x => x.id === item.herramienta_id)
                  return (
                    <div key={item.herramienta_id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                      style={{ border: `1.5px solid ${ESTADO_HERRAMIENTA_COLORS[item.estado]}`, background: 'var(--color-surface-1)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                        {h?.descripcion ?? '-'}
                        {item.es_adicional && (
                          <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}>
                            Adicional
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${ESTADO_HERRAMIENTA_COLORS[item.estado]}22`, color: ESTADO_HERRAMIENTA_COLORS[item.estado] }}>
                          {ESTADO_HERRAMIENTA_LABELS[item.estado]}
                        </span>
                        <span className="text-sm font-bold" style={{ color: 'var(--color-secondary)' }}>{item.cantidad_entregada}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {observacion.trim() && (
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Observación: {observacion.trim()}</p>
              )}
            </div>
            <div className="px-5 py-4 flex gap-3 justify-end shrink-0" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <button onClick={() => setFase('seleccion')}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
                Corregir
              </button>
              <button onClick={() => { setHasStrokes(false); setFase('firma') }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                De acuerdo
              </button>
            </div>
          </>
        )}

        {fase === 'firma' && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                Firma de {recibido ? `${recibido.first_name} ${recibido.last_name}` : 'quien recibe'} confirmando que recibió lo anterior.
              </p>
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="w-full rounded-xl touch-none"
                style={{ border: '1.5px solid var(--color-border)', background: '#fff' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            <div className="px-5 py-4 flex gap-3 justify-between shrink-0" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <button onClick={limpiar} disabled={registrar.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
                Limpiar
              </button>
              <button onClick={handleConfirmar} disabled={!hasStrokes || registrar.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
                style={{ background: 'var(--color-primary)', color: '#fff', opacity: (!hasStrokes || registrar.isPending) ? 0.6 : 1 }}>
                {registrar.isPending ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                Confirmar entrega
              </button>
            </div>
          </>
        )}
      </div>
    </ModalPortal>
  )
}
