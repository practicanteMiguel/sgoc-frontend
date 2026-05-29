'use client'

import { useState, useMemo } from 'react'
import { Loader2, Equal, Search, X, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { useRequisicion, useRecepcionRQ } from '@/src/hooks/consumables/use-requisiciones'
import { CATEGORIA_LABELS } from '@/src/types/consumables.types'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import type { RQItem } from '@/src/types/consumables.types'

function formatCOP(v: number | null | undefined) {
  if (v == null) return '-'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
}

interface Props {
  rqId: string
  onClose: () => void
}

export function RecepcionModal({ rqId, onClose }: Props) {
  const { data: rq, isLoading } = useRequisicion(rqId)
  const recepcion = useRecepcionRQ()

  const [fase, setFase]               = useState<'llenado' | 'confirmacion'>('llenado')
  const [busqueda, setBusqueda]       = useState('')
  const [fechaEntrega, setFechaEntrega] = useState(() => new Date().toISOString().split('T')[0])
  const [cantidades, setCantidades]   = useState<Record<string, string>>({})

  const sortedItems = useMemo(
    () => rq ? [...rq.items].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' })) : [],
    [rq],
  )

  const filteredItems = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return sortedItems
    return sortedItems.filter((i) => i.codigo.toLowerCase().includes(q) || i.descripcion.toLowerCase().includes(q))
  }, [sortedItems, busqueda])

  function getRec(item: RQItem): number {
    const v = cantidades[item.id]
    return v === undefined || v === '' ? 0 : Math.round(Math.max(0, Number(v)))
  }

  const totalSolUnid = useMemo(() => sortedItems.reduce((s, i) => s + Math.round(Number(i.solicitado ?? 0)), 0), [sortedItems])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totalRecUnid = useMemo(() => sortedItems.reduce((s, i) => s + getRec(i), 0), [sortedItems, cantidades])
  const totalSolCOP  = useMemo(() => sortedItems.reduce((s, i) => i.valor_unitario != null ? s + Math.round(Number(i.solicitado ?? 0)) * Number(i.valor_unitario) : s, 0), [sortedItems])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totalRecCOP  = useMemo(() => sortedItems.reduce((s, i) => i.valor_unitario != null ? s + getRec(i) * i.valor_unitario : s, 0), [sortedItems, cantidades])

  const analysis = useMemo(() => {
    const sinEntregar:   RQItem[] = []
    const conDiferencia: { item: RQItem; sol: number; rec: number }[] = []
    const correcto:      RQItem[] = []
    for (const item of sortedItems) {
      const sol = Math.round(Number(item.solicitado ?? 0))
      const rec = getRec(item)
      if (rec === 0)        sinEntregar.push(item)
      else if (rec === sol) correcto.push(item)
      else                  conDiferencia.push({ item, sol, rec })
    }
    return { sinEntregar, conDiferencia, correcto }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedItems, cantidades])

  function handleConfirmar() {
    if (!rq || !fechaEntrega) return
    recepcion.mutate(
      {
        id: rqId,
        fecha_entrega: fechaEntrega,
        items: sortedItems.map((item) => ({ id: item.id, recibido: getRec(item) })),
      },
      { onSuccess: () => onClose() },
    )
  }

  if (isLoading || !rq) {
    return (
      <ModalPortal onClose={onClose}>
        <div
          className="w-full max-w-lg rounded-2xl flex items-center justify-center py-20"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
        >
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      </ModalPortal>
    )
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-4xl rounded-2xl flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
              Recepcion de insumos
            </p>
            <h2 className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-text-900)' }}>
              RQ #{rq.numero_rq} &middot; {CATEGORIA_LABELS[rq.categoria]} &middot; {rq.lugar} CC{rq.lote}
            </h2>
          </div>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        {fase === 'llenado' ? (
          <>
            {/* Controls */}
            <div className="px-6 py-3 flex items-end gap-3 flex-wrap shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Fecha de entrega</label>
                <input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="rounded-lg px-3 py-1.5 text-sm"
                  style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', outline: 'none' }}
                />
              </div>
              <div
                className="flex-1 flex items-center gap-2 rounded-lg px-3 py-1.5 min-w-52"
                style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)' }}
              >
                <Search size={13} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por codigo o descripcion..."
                  className="flex-1 text-sm outline-none"
                  style={{ background: 'transparent', color: 'var(--color-text-900)' }}
                />
                {busqueda && (
                  <button onClick={() => setBusqueda('')} style={{ color: 'var(--color-text-400)' }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Items table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Codigo', 'Descripcion', 'Unidad', 'Pedido', 'Recibido'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-left whitespace-nowrap"
                        style={{ color: 'var(--color-text-400)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const val = cantidades[item.id] ?? ''
                    const rec = val === '' ? null : Math.round(Math.max(0, Number(val)))
                    const sol = Math.round(Number(item.solicitado ?? 0))
                    const borderColor = rec === null
                      ? 'var(--color-border)'
                      : rec === sol ? '#16a34a'
                      : rec < sol  ? '#f59e0b'
                      :               '#3b82f6'
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)',
                        }}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-400)' }}>
                          {item.codigo}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--color-text-900)', minWidth: 220 }}>
                          {item.descripcion}
                        </td>
                        <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-400)' }}>
                          {item.unidad}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-bold text-center whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>
                          {sol}
                        </td>
                        <td className="px-4 py-2.5" style={{ minWidth: 140 }}>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={val}
                              onChange={(e) => setCantidades((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="0"
                              className="w-16 rounded-md px-2 py-1 text-xs text-right"
                              style={{
                                border: `1.5px solid ${borderColor}`,
                                background: 'var(--color-surface-0)',
                                color: 'var(--color-text-900)',
                                outline: 'none',
                              }}
                            />
                            <button
                              onClick={() => setCantidades((prev) => ({ ...prev, [item.id]: String(sol) }))}
                              title="Igual al pedido"
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:opacity-80 transition-opacity"
                              style={{ background: 'var(--color-primary)', color: '#fff' }}
                            >
                              <Equal size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div
              className="px-6 py-3 flex flex-wrap items-center gap-3 shrink-0"
              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
            >
              <div className="flex gap-6 flex-1 text-xs min-w-fit">
                <span style={{ color: 'var(--color-text-400)' }}>
                  Pedido: <strong style={{ color: 'var(--color-text-900)' }}>{totalSolUnid} uds</strong>
                </span>
                <span style={{ color: 'var(--color-text-400)' }}>
                  Recibido:{' '}
                  <strong
                    style={{
                      color: totalRecUnid === totalSolUnid && totalRecUnid > 0
                        ? '#16a34a'
                        : totalRecUnid > 0 ? '#f59e0b' : 'var(--color-text-400)',
                    }}
                  >
                    {totalRecUnid} uds
                  </strong>
                </span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-70 transition-opacity"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setFase('confirmacion')}
                  disabled={!fechaEntrega}
                  className="flex-1 sm:flex-none px-5 py-2 rounded-xl text-sm font-bold transition-opacity"
                  style={{ background: 'var(--color-primary)', color: '#fff', opacity: !fechaEntrega ? 0.5 : 1 }}
                >
                  Revisar y cerrar
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Confirmation body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              {/* Monetary totals */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Total solicitado</p>
                  <p className="text-base font-bold mt-1" style={{ color: 'var(--color-text-900)' }}>{formatCOP(totalSolCOP)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{totalSolUnid} unidades</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Total recibido</p>
                  <p
                    className="text-base font-bold mt-1"
                    style={{ color: totalRecCOP === totalSolCOP ? '#16a34a' : '#f59e0b' }}
                  >
                    {formatCOP(totalRecCOP)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{totalRecUnid} unidades</p>
                </div>
              </div>

              {/* Sin entregar */}
              {analysis.sinEntregar.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div
                    className="flex items-center gap-2 px-4 py-2.5"
                    style={{ background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <XCircle size={13} style={{ color: '#ef4444' }} />
                    <span className="text-xs font-bold" style={{ color: '#b91c1c' }}>
                      No entregados ({analysis.sinEntregar.length})
                    </span>
                    <span className="text-xs ml-1" style={{ color: '#ef4444' }}>
                      - se registraran como no recibidos
                    </span>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-1.5">
                    {analysis.sinEntregar.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold shrink-0" style={{ color: 'var(--color-text-400)', minWidth: 60 }}>
                          {item.codigo}
                        </span>
                        <span style={{ color: 'var(--color-text-700)' }}>{item.descripcion}</span>
                        <span className="ml-auto font-semibold whitespace-nowrap" style={{ color: '#ef4444' }}>
                          Pedido: {item.solicitado}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Con diferencia */}
              {analysis.conDiferencia.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
                  <div
                    className="flex items-center gap-2 px-4 py-2.5"
                    style={{ background: 'rgba(245,158,11,0.06)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}
                  >
                    <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
                    <span className="text-xs font-bold" style={{ color: '#b45309' }}>
                      Con diferencia ({analysis.conDiferencia.length})
                    </span>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-1.5">
                    {analysis.conDiferencia.map(({ item, sol, rec }) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold shrink-0" style={{ color: 'var(--color-text-400)', minWidth: 60 }}>
                          {item.codigo}
                        </span>
                        <span style={{ color: 'var(--color-text-700)' }}>{item.descripcion}</span>
                        <span
                          className="ml-auto font-semibold whitespace-nowrap"
                          style={{ color: rec < sol ? '#f59e0b' : '#3b82f6' }}
                        >
                          {sol} &rarr; {rec} ({rec > sol ? '+' : ''}{rec - sol})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correcto */}
              {analysis.correcto.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(22,163,74,0.3)' }}>
                  <div
                    className="flex items-center gap-2 px-4 py-2.5"
                    style={{ background: 'rgba(22,163,74,0.06)', borderBottom: '1px solid rgba(22,163,74,0.2)' }}
                  >
                    <CheckCircle2 size={13} style={{ color: '#16a34a' }} />
                    <span className="text-xs font-bold" style={{ color: '#15803d' }}>
                      Recibidos correctamente ({analysis.correcto.length})
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                      {analysis.correcto.map((i) => i.descripcion).join(' · ')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 flex items-center justify-between gap-3 shrink-0"
              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
            >
              <button
                onClick={() => setFase('llenado')}
                className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-70 transition-opacity"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
              >
                Volver
              </button>
              <div className="flex flex-col items-end gap-1">
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                  Tu firma se registrara automaticamente y la RQ pasara a Entregado
                </p>
                <button
                  onClick={handleConfirmar}
                  disabled={recepcion.isPending || !fechaEntrega}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-opacity"
                  style={{
                    background: '#16a34a',
                    color: '#fff',
                    opacity: (recepcion.isPending || !fechaEntrega) ? 0.6 : 1,
                  }}
                >
                  {recepcion.isPending && <Loader2 size={14} className="animate-spin" />}
                  {recepcion.isPending ? 'Registrando...' : 'Confirmar entrega'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ModalPortal>
  )
}
