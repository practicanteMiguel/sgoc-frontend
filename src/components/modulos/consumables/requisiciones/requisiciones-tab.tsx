'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Loader2, Eye, Trash2, AlertTriangle, FileText,
  ChevronLeft, ChevronRight, ChevronDown, ClipboardCheck, ExternalLink, CheckCircle2, RotateCcw,
  Pencil, Check, X, Banknote, MapPin,
} from 'lucide-react'
import { useRequisiciones, useDeleteRequisicion } from '@/src/hooks/consumables/use-requisiciones'
import { useInformeFacturas } from '@/src/hooks/consumables/use-informe'
import { useSolicitudes, useSolicitud, useGenerarRQs, useSolicitudRequisiciones, useReabrirSolicitud } from '@/src/hooks/consumables/use-solicitudes'
import {
  useFields, useActualizarPresupuesto,
  useFieldLugares, useCreateFieldLugar, useActualizarFieldLugarPresupuesto, useDeleteFieldLugar,
} from '@/src/hooks/reports/use-fields'
import type { Field } from '@/src/types/reports.types'
import { RequisicionModal } from './requisicion-modal'
import { RequisicionDetail } from './requisicion-detail'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { CATEGORIAS, CATEGORIA_LABELS } from '@/src/types/consumables.types'
import type {
  RequisicionSummary, CategoriaInsumo, SolicitudItem, GenerarRQsResult, AjusteSolicitadoDto,
} from '@/src/types/consumables.types'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatCOP(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value))
}

const BADGE_COLORS: Record<string, string> = {
  ABIERTA:          '#6b7280',
  COMPLETADA:       '#22c55e',
  PENDIENTE:        '#f59e0b',
  APROBADA:         '#3b82f6',
  PEDIDO_REALIZADO: '#f59e0b',
  EN_BODEGA:        '#0891b2',
  ENTREGADO:        '#16a34a',
}
const BADGE_LABELS: Record<string, string> = {
  ABIERTA:          'Abierta',
  COMPLETADA:       'Completada',
  PENDIENTE:        'Pendiente',
  APROBADA:         'Aprobada',
  PEDIDO_REALIZADO: 'Pedido realizado',
  EN_BODEGA:        'En bodega',
  ENTREGADO:        'Entregado',
}

function EstadoBadge({ estado }: { estado: string }) {
  const color = BADGE_COLORS[estado] ?? '#6b7280'
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `${color}22`, color }}
    >
      {BADGE_LABELS[estado] ?? estado}
    </span>
  )
}

// ── Revision modal (revisar solicitud completada y generar RQs) ───────────────
function RevisionSolicitudModal({ solicitudId, onClose }: { solicitudId: string; onClose: () => void }) {
  const { data: solicitud, isLoading } = useSolicitud(solicitudId)
  const { data: rqsExistentes = [] } = useSolicitudRequisiciones(solicitudId)
  const generar = useGenerarRQs()
  const reabrir = useReabrirSolicitud()
  const [numeros,    setNumeros]    = useState<Partial<Record<CategoriaInsumo, string>>>({})
  const [result,     setResult]     = useState<GenerarRQsResult | null>(null)
  const [cantidades, setCantidades] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!solicitud) return
    const init: Record<string, string> = {}
    for (const catData of solicitud.categorias ?? []) {
      for (const item of catData.items) {
        if ((item.solicitado ?? 0) > 0) init[item.id] = String(parseInt(String(item.solicitado ?? 0), 10))
      }
    }
    setCantidades(init)
  }, [solicitud?.id])

  if (isLoading) {
    return (
      <ModalPortal onClose={onClose}>
        <div className="w-full max-w-3xl rounded-xl flex items-center justify-center py-24" style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.25)' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      </ModalPortal>
    )
  }

  if (!solicitud) return null

  const yaGeneradas = rqsExistentes.length > 0

  const porCategoria: Record<CategoriaInsumo, SolicitudItem[]> = { PAPELERIA: [], CONSUMIBLE: [], EPP: [] }
  for (const catData of (solicitud.categorias ?? [])) {
    porCategoria[catData.categoria] = catData.items.filter(i => (i.solicitado ?? 0) > 0)
  }

  function cantidadAjustada(item: SolicitudItem) {
    const v = cantidades[item.id]
    return v !== undefined ? Number(v) : Number(item.solicitado ?? 0)
  }

  function isModificado(item: SolicitudItem) {
    return cantidades[item.id] !== undefined && Number(cantidades[item.id]) !== Number(item.solicitado ?? 0)
  }

  function subtotalCategoria(cat: CategoriaInsumo) {
    return porCategoria[cat].reduce((sum, item) => sum + cantidadAjustada(item) * Number(item.valor_unitario ?? 0), 0)
  }

  const categoriasConItems = CATEGORIAS.filter((c) => porCategoria[c].some(i => cantidadAjustada(i) > 0))
  const allItems = (solicitud.categorias ?? []).flatMap(c => c.items)
  const ajustesCount = allItems.filter(i => isModificado(i)).length

  function handleGenerar() {
    const asignaciones = categoriasConItems
      .filter((c) => numeros[c] && Number(numeros[c]) > 0)
      .map((c) => ({ categoria: c, numero_rq: Number(numeros[c]) }))
    const ajustes: AjusteSolicitadoDto[] = allItems
      .filter(i => isModificado(i))
      .map(i => ({
        item_id:             i.id,
        solicitado_nuevo:    cantidadAjustada(i),
        solicitado_original: Number(i.solicitado ?? 0),
      }))
    generar.mutate(
      { solicitud_id: solicitudId, asignaciones, ajustes: ajustes.length > 0 ? ajustes : undefined },
      { onSuccess: (data) => setResult(data) },
    )
  }

  const allFilled = categoriasConItems.every((c) => numeros[c] && Number(numeros[c]) > 0)

  // Success view after generating
  if (result) {
    return (
      <ModalPortal onClose={onClose}>
        <div
          className="w-full max-w-md rounded-xl overflow-hidden flex flex-col"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.25)', maxHeight: '80vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-5 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <CheckCircle2 size={22} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <p className="font-semibold text-base" style={{ color: 'var(--color-text-900)' }}>
                {result.created} RQ{result.created !== 1 ? 's' : ''} generada{result.created !== 1 ? 's' : ''}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>{solicitud.lugar}</p>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 px-6 pb-4 flex flex-col gap-2">
            {result.requisiciones.map((rq) => (
              <div
                key={rq.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                    RQ #{rq.numero_rq}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                    {CATEGORIA_LABELS[rq.categoria]}
                  </p>
                </div>
                <a
                  href={`/dashboard/consumables/requisiciones/${rq.id}`}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                >
                  <ExternalLink size={11} /> Ver
                </a>
              </div>
            ))}
          </div>
          <div className="px-6 pb-5 pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </ModalPortal>
    )
  }

  const modalHeader = (
    <div className="px-6 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div>
        <h3 className="font-semibold text-base" style={{ color: 'var(--color-text-900)' }}>
          {solicitud.lugar}
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
          CC {solicitud.lote}
          {solicitud.nombre_solicitante && ` · ${solicitud.nombre_solicitante}`}
          {solicitud.fecha && ` · ${new Date(solicitud.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`}
        </p>
      </div>
      <button
        onClick={onClose}
        className="text-xs px-3 py-1.5 rounded-lg font-medium shrink-0"
        style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
      >
        Cerrar
      </button>
    </div>
  )

  // RQs ya generadas — solo lectura
  if (yaGeneradas) {
    return (
      <ModalPortal onClose={onClose}>
        <div
          className="w-full max-w-3xl rounded-xl overflow-hidden flex flex-col"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.25)', maxHeight: '80vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {modalHeader}
          <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} style={{ color: '#16a34a' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                Requisiciones generadas ({rqsExistentes.length})
              </p>
            </div>
            {rqsExistentes.map((rq) => (
              <div
                key={rq.id}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg"
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                    RQ #{rq.numero_rq}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                    {CATEGORIA_LABELS[rq.categoria]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <EstadoBadge estado={rq.estado} />
                  <a
                    href={`/dashboard/consumables/requisiciones/${rq.id}`}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                  >
                    <ExternalLink size={11} /> Ver
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 pb-5 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)', border: '1px solid var(--color-border)' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </ModalPortal>
    )
  }

  // Revision normal — generar RQs
  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-3xl rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.25)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {modalHeader}

        {/* Body: items grouped by category */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
          {solicitud.excede_presupuesto && (
            <div
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl shrink-0"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#dc2626' }}>Excede el presupuesto</p>
                <p className="text-xs mt-0.5" style={{ color: '#b91c1c' }}>
                  El total solicitado supera el tope de {formatCOP(solicitud.presupuesto)} asignado a esta planta
                </p>
              </div>
            </div>
          )}
          {categoriasConItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <FileText size={28} style={{ color: 'var(--color-text-400)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                Sin items solicitados
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                Esta planta no solicito ningun insumo
              </p>
            </div>
          ) : (
            categoriasConItems.map((cat) => (
              <div key={cat} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)' }}
                  >
                    {CATEGORIA_LABELS[cat]}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>
                    Subtotal: {formatCOP(subtotalCategoria(cat))}
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                          {['Codigo', 'Descripcion', 'Unidad', 'V. Unitario', 'Solicitado', 'Total'].map((h) => (
                            <th
                              key={h}
                              className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                              style={{ color: 'var(--color-text-400)' }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {porCategoria[cat].map((item, idx) => {
                          const mod = isModificado(item)
                          const cant = cantidadAjustada(item)
                          const rowTotal = cant * Number(item.valor_unitario ?? 0)
                          return (
                            <tr
                              key={item.id}
                              style={{
                                borderBottom: '1px solid var(--color-border)',
                                background: mod
                                  ? 'rgba(196,152,0,0.05)'
                                  : (idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)'),
                              }}
                            >
                              <td className="px-3 py-2.5 font-mono text-xs font-semibold" style={{ color: 'var(--color-text-600)', borderLeft: mod ? '3px solid var(--color-secondary)' : undefined }}>
                                {item.codigo}
                              </td>
                              <td className="px-3 py-2.5 text-xs font-medium max-w-52 truncate" style={{ color: 'var(--color-text-900)' }}>
                                {item.descripcion}
                              </td>
                              <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-600)' }}>
                                {item.unidad}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-right font-semibold" style={{ color: 'var(--color-text-900)' }}>
                                {formatCOP(item.valor_unitario)}
                              </td>
                              <td className="px-3 py-2 text-xs" style={{ minWidth: 80 }}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={cantidades[item.id] ?? String(parseInt(String(item.solicitado ?? 0), 10))}
                                  onChange={(e) => { if (/^\d*$/.test(e.target.value)) setCantidades(prev => ({ ...prev, [item.id]: e.target.value })) }}
                                  className="rounded text-xs outline-none text-right w-full"
                                  style={{
                                    border: `1.5px solid ${mod ? 'var(--color-secondary)' : 'var(--color-border)'}`,
                                    background: mod ? 'rgba(196,152,0,0.08)' : 'var(--color-surface-0)',
                                    color: 'var(--color-secondary)',
                                    padding: '4px 6px',
                                    fontWeight: 700,
                                  }}
                                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                                  onBlur={(e)  => { e.target.style.borderColor = mod ? 'var(--color-secondary)' : 'var(--color-border)' }}
                                />
                                {mod && (
                                  <span className="block text-center mt-0.5" style={{ fontSize: 9, color: 'var(--color-text-400)' }}>
                                    orig: {item.solicitado}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-right font-semibold" style={{ color: 'var(--color-text-900)' }}>
                                {formatCOP(rowTotal)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex flex-col gap-3 shrink-0" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          {categoriasConItems.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-400)' }}>
                  Asignar numero RQ por categoria
                </p>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <p className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>
                    Total: {formatCOP(categoriasConItems.reduce((sum, cat) => sum + subtotalCategoria(cat), 0))}
                  </p>
                  {solicitud.presupuesto != null && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{
                        background: solicitud.excede_presupuesto ? 'rgba(239,68,68,0.12)' : 'rgba(22,163,74,0.12)',
                        color: solicitud.excede_presupuesto ? '#dc2626' : '#16a34a',
                      }}
                    >
                      Tope: {formatCOP(solicitud.presupuesto)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {categoriasConItems.map((cat) => (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-700)' }}>
                      {CATEGORIA_LABELS[cat]}
                    </span>
                    <input
                      type="number"
                      min="1"
                      placeholder="# RQ"
                      value={numeros[cat] ?? ''}
                      onChange={(e) => setNumeros((prev) => ({ ...prev, [cat]: e.target.value }))}
                      className="rounded-lg text-sm outline-none text-center"
                      style={{
                        border: '1.5px solid var(--color-border)',
                        background: 'var(--color-surface-0)',
                        color: 'var(--color-text-900)',
                        padding: '6px 10px',
                        width: 90,
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                      onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
          {ajustesCount > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(196,152,0,0.08)', border: '1px solid rgba(196,152,0,0.28)', color: '#92400e' }}
            >
              <AlertTriangle size={12} className="shrink-0" />
              {ajustesCount} cantidad{ajustesCount !== 1 ? 'es' : ''} ajustada{ajustesCount !== 1 ? 's' : ''} — el supervisor sera notificado al generar las RQs
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => reabrir.mutate(solicitudId, { onSuccess: onClose })}
              disabled={reabrir.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity shrink-0"
              style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-700)', border: '1px solid var(--color-border)', opacity: reabrir.isPending ? 0.6 : 1 }}
            >
              {reabrir.isPending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              Re-abrir solicitud
            </button>
            {categoriasConItems.length > 0 && (
              <button
                onClick={handleGenerar}
                disabled={generar.isPending || !allFilled}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-opacity"
                style={{
                  background: allFilled ? 'var(--color-primary)' : '#9ca3af',
                  color: '#fff',
                  opacity: generar.isPending ? 0.75 : 1,
                  cursor: allFilled ? 'pointer' : 'not-allowed',
                }}
              >
                {generar.isPending ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                {generar.isPending ? 'Generando...' : 'Generar RQs'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ rq, onClose }: { rq: RequisicionSummary; onClose: () => void }) {
  const del = useDeleteRequisicion()
  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-sm rounded-xl overflow-hidden"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <AlertTriangle size={22} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--color-text-900)' }}>Eliminar requisicion</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-400)' }}>
              RQ #{rq.numero_rq} - {CATEGORIA_LABELS[rq.categoria]}
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => del.mutate(rq.id, { onSuccess: onClose })}
            disabled={del.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#ef4444', color: '#fff', opacity: del.isPending ? 0.75 : 1 }}
          >
            {del.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {del.isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Field row with expandable sublocations ────────────────────────────────────
function FieldPresupuestoRow({ field }: { field: Field }) {
  const [expanded,        setExpanded]        = useState(false)
  const [editingBudget,   setEditingBudget]   = useState(false)
  const [editValue,       setEditValue]       = useState('')
  const [editingLugarId,  setEditingLugarId]  = useState<string | null>(null)
  const [editLugarValue,  setEditLugarValue]  = useState('')
  const [showAdd,         setShowAdd]         = useState(false)
  const [newNombre,       setNewNombre]       = useState('')

  const { data: lugares = [], isLoading: lugaresLoading } = useFieldLugares(expanded ? field.id : null)
  const actualizarField  = useActualizarPresupuesto()
  const actualizarLugar  = useActualizarFieldLugarPresupuesto()
  const createLugar      = useCreateFieldLugar()
  const deleteLugar      = useDeleteFieldLugar()

  function saveFieldBudget() {
    const presupuesto = editValue.trim() === '' ? null : Number(editValue.trim())
    actualizarField.mutate({ id: field.id, presupuesto }, { onSuccess: () => setEditingBudget(false) })
  }

  function saveLugarBudget(lugarId: string) {
    const presupuesto = editLugarValue.trim() === '' ? null : Number(editLugarValue.trim())
    actualizarLugar.mutate({ fieldId: field.id, lugarId, presupuesto }, { onSuccess: () => setEditingLugarId(null) })
  }

  function handleAddLugar() {
    if (!newNombre.trim()) return
    createLugar.mutate(
      { fieldId: field.id, nombre: newNombre.trim() },
      { onSuccess: () => { setNewNombre(''); setShowAdd(false) } },
    )
  }

  return (
    <>
      {/* Plant row */}
      <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded((p) => !p)}
              className="w-5 h-5 flex items-center justify-center rounded hover:opacity-70 transition-opacity shrink-0"
            >
              <ChevronDown
                size={13}
                style={{
                  transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                  transition: 'transform 0.15s',
                  color: 'var(--color-text-400)',
                }}
              />
            </button>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-900)' }}>{field.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-600)' }}>{field.location}</td>
        <td className="px-4 py-3">
          {editingBudget ? (
            <input
              autoFocus type="text" inputMode="numeric" value={editValue}
              onChange={(e) => { if (/^\d*$/.test(e.target.value)) setEditValue(e.target.value) }}
              placeholder="Sin limite"
              className="rounded-lg text-xs outline-none"
              style={{ border: '1.5px solid var(--color-secondary)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', padding: '5px 9px', width: 140 }}
              onKeyDown={(e) => { if (e.key === 'Enter') saveFieldBudget(); if (e.key === 'Escape') setEditingBudget(false) }}
            />
          ) : (
            <span className="text-xs font-semibold" style={{ color: field.presupuesto != null ? 'var(--color-text-900)' : 'var(--color-text-400)' }}>
              {field.presupuesto != null ? formatCOP(field.presupuesto) : 'Sin limite'}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {editingBudget ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={saveFieldBudget} disabled={actualizarField.isPending}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {actualizarField.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              </button>
              <button
                onClick={() => setEditingBudget(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingBudget(true); setEditValue(field.presupuesto != null ? String(field.presupuesto) : '') }}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
            >
              <Pencil size={11} />
            </button>
          )}
        </td>
      </tr>

      {/* Expanded sublocations */}
      {expanded && (
        <>
          {lugaresLoading ? (
            <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <td colSpan={4} className="px-10 py-3">
                <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
              </td>
            </tr>
          ) : (
            <>
              {lugares.map((lugar) => (
                <tr key={lugar.id} style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                  <td className="py-2.5 pr-4" style={{ paddingLeft: 40 }}>
                    <div className="flex items-center gap-2">
                      <MapPin size={10} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                      <span className="text-xs" style={{ color: 'var(--color-text-700)' }}>{lugar.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--color-text-400)' }}>Sublocation</td>
                  <td className="px-4 py-2.5">
                    {editingLugarId === lugar.id ? (
                      <input
                        autoFocus type="text" inputMode="numeric" value={editLugarValue}
                        onChange={(e) => { if (/^\d*$/.test(e.target.value)) setEditLugarValue(e.target.value) }}
                        placeholder="Sin limite"
                        className="rounded-lg text-xs outline-none"
                        style={{ border: '1.5px solid var(--color-secondary)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', padding: '5px 9px', width: 140 }}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveLugarBudget(lugar.id); if (e.key === 'Escape') setEditingLugarId(null) }}
                      />
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: lugar.presupuesto != null ? 'var(--color-text-900)' : 'var(--color-text-400)' }}>
                        {lugar.presupuesto != null ? formatCOP(lugar.presupuesto) : 'Sin limite'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {editingLugarId === lugar.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => saveLugarBudget(lugar.id)} disabled={actualizarLugar.isPending}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                          style={{ background: 'var(--color-primary)', color: '#fff' }}
                        >
                          {actualizarLugar.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        </button>
                        <button
                          onClick={() => setEditingLugarId(null)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { setEditingLugarId(lugar.id); setEditLugarValue(lugar.presupuesto != null ? String(lugar.presupuesto) : '') }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => deleteLugar.mutate({ fieldId: field.id, lugarId: lugar.id })}
                          disabled={deleteLugar.isPending}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {/* Add sublocation */}
              {showAdd ? (
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                  <td className="py-2.5 pr-4" style={{ paddingLeft: 40 }} colSpan={2}>
                    <input
                      autoFocus type="text" value={newNombre}
                      onChange={(e) => setNewNombre(e.target.value)}
                      placeholder="Nombre del lugar"
                      className="rounded-lg text-xs outline-none w-full"
                      style={{ border: '1.5px solid var(--color-secondary)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', padding: '5px 9px' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddLugar()
                        if (e.key === 'Escape') { setShowAdd(false); setNewNombre('') }
                      }}
                    />
                  </td>
                  <td className="px-4 py-2.5" colSpan={2}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleAddLugar}
                        disabled={createLugar.isPending || !newNombre.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-70 transition-opacity"
                        style={{ background: 'var(--color-primary)', color: '#fff', opacity: !newNombre.trim() ? 0.5 : 1 }}
                      >
                        {createLugar.isPending ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                        Guardar
                      </button>
                      <button
                        onClick={() => { setShowAdd(false); setNewNombre('') }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-70 transition-opacity"
                        style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                  <td colSpan={4} className="py-2" style={{ paddingLeft: 40 }}>
                    <button
                      onClick={() => setShowAdd(true)}
                      className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      <Plus size={11} /> Agregar lugar
                    </button>
                  </td>
                </tr>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}

// ── Presupuestos modal ────────────────────────────────────────────────────────
function PresupuestosModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useFields(1, 100)
  const fields: Field[] = data?.data ?? []

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.25)', maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 flex items-center justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2.5">
            <Banknote size={16} style={{ color: 'var(--color-primary)' }} />
            <h3 className="font-semibold text-base" style={{ color: 'var(--color-text-900)' }}>
              Presupuestos por planta
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
          >
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-6">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin plantas registradas</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Planta', 'Ubicacion', 'Presupuesto mensual', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--color-text-400)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <FieldPresupuestoRow key={field.id} field={field} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Solicitudes section ───────────────────────────────────────────────────────
function SolicitudesSection({ mes, anio }: { mes: number; anio: number }) {
  const [revisar,      setRevisar]      = useState<string | null>(null)
  const [expandedIds,  setExpandedIds]  = useState<Set<string>>(new Set())
  const { data: solicitudes = [], isLoading } = useSolicitudes(mes, anio)

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Group: mains (no field_lugar_id) + adicionales keyed by field_id
  const mainSolicitudes = solicitudes.filter((s) => !s.field_lugar_id)
  const adicionales     = solicitudes.filter((s) => !!s.field_lugar_id)
  const adicionalesByFieldId = adicionales.reduce<Record<string, typeof adicionales>>((acc, s) => {
    const key = s.field_id ?? '__orphan__'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})
  const mainFieldIds      = new Set(mainSolicitudes.map((s) => s.field_id).filter(Boolean) as string[])
  const orphanAdicionales = (adicionalesByFieldId['__orphan__'] ?? []).concat(
    adicionales.filter((s) => s.field_id && !mainFieldIds.has(s.field_id)),
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
          Solicitudes de plantas
        </h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : solicitudes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-8 rounded-xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <FileText size={24} className="mb-2" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin solicitudes</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
            Usa &quot;Enviar a plantas&quot; en la vista de Insumos para enviar las plantillas de {MESES[mes - 1]} {anio}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                {['Planta', 'C. Costo', 'Presupuesto', 'Estado', 'Acciones'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--color-text-400)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mainSolicitudes.map((s) => {
                const children = s.field_id ? (adicionalesByFieldId[s.field_id] ?? []) : []
                const expanded = expandedIds.has(s.id)
                return (
                  <>
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}>
                      <td className="py-3 pr-4 pl-2">
                        <div className="flex items-center gap-1">
                          {children.length > 0 ? (
                            <button
                              onClick={() => toggleExpand(s.id)}
                              className="w-5 h-5 flex items-center justify-center rounded hover:opacity-70 transition-opacity shrink-0"
                            >
                              <ChevronDown
                                size={12}
                                style={{
                                  transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                  transition: 'transform 0.15s',
                                  color: 'var(--color-text-400)',
                                }}
                              />
                            </button>
                          ) : (
                            <span className="w-5 shrink-0" />
                          )}
                          <span className="font-medium text-xs max-w-44 truncate" style={{ color: 'var(--color-text-900)' }}>{s.lugar}</span>
                          {children.length > 0 && (
                            <span
                              className="text-xs font-semibold px-1.5 py-0.5 rounded-full ml-1 shrink-0"
                              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}
                            >
                              +{children.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-600)' }}>{s.lote}</td>
                      <td className="px-4 py-3 text-xs font-semibold" style={{ color: s.presupuesto != null ? 'var(--color-text-900)' : 'var(--color-text-300)' }}>
                        {s.presupuesto != null ? formatCOP(s.presupuesto) : '-'}
                      </td>
                      <td className="px-4 py-3"><EstadoBadge estado={s.estado} /></td>
                      <td className="px-4 py-3">
                        {s.estado === 'COMPLETADA' && (
                          <button
                            onClick={() => setRevisar(s.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                            style={{ background: 'var(--color-primary)', color: '#fff' }}
                          >
                            <ClipboardCheck size={12} /> Revisar
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded && children.map((child) => (
                      <tr key={child.id} style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                        <td className="py-2.5 pr-4" style={{ paddingLeft: 40 }}>
                          <div className="flex items-center gap-2">
                            <MapPin size={10} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                            <span className="text-xs max-w-44 truncate" style={{ color: 'var(--color-text-700)' }}>{child.lugar}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--color-text-600)' }}>{child.lote}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: child.presupuesto != null ? 'var(--color-text-900)' : 'var(--color-text-300)' }}>
                          {child.presupuesto != null ? formatCOP(child.presupuesto) : '-'}
                        </td>
                        <td className="px-4 py-2.5"><EstadoBadge estado={child.estado} /></td>
                        <td className="px-4 py-2.5">
                          {child.estado === 'COMPLETADA' && (
                            <button
                              onClick={() => setRevisar(child.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                              style={{ background: 'var(--color-primary)', color: '#fff' }}
                            >
                              <ClipboardCheck size={12} /> Revisar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                )
              })}
              {orphanAdicionales.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}>
                  <td className="px-4 py-3 font-medium text-xs max-w-48 truncate" style={{ color: 'var(--color-text-900)' }}>{s.lugar}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-600)' }}>{s.lote}</td>
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: s.presupuesto != null ? 'var(--color-text-900)' : 'var(--color-text-300)' }}>
                    {s.presupuesto != null ? formatCOP(s.presupuesto) : '-'}
                  </td>
                  <td className="px-4 py-3"><EstadoBadge estado={s.estado} /></td>
                  <td className="px-4 py-3">
                    {s.estado === 'COMPLETADA' && (
                      <button
                        onClick={() => setRevisar(s.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                        style={{ background: 'var(--color-primary)', color: '#fff' }}
                      >
                        <ClipboardCheck size={12} /> Revisar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {revisar && <RevisionSolicitudModal solicitudId={revisar} onClose={() => setRevisar(null)} />}
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export function RequisicionesTab() {
  const now  = new Date()
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())

  function adjustPeriod(delta: number) {
    let m = mes + delta, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  const { data: requisiciones = [], isLoading } = useRequisiciones({ mes, anio })
  const { data: informe } = useInformeFacturas(mes, anio)
  const facturadoSet = useMemo(() => {
    const set = new Set<string>()
    for (const row of informe?.rows ?? []) {
      if (row.precio_real != null) set.add(row.rq_id)
    }
    return set
  }, [informe])
  const [showCreate,       setShowCreate]       = useState(false)
  const [deleteRq,         setDeleteRq]         = useState<RequisicionSummary | null>(null)
  const [selectedId,       setSelectedId]       = useState<string | null>(null)
  const [showPresupuestos, setShowPresupuestos] = useState(false)

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (selectedId) {
    return <RequisicionDetail id={selectedId} onBack={() => setSelectedId(null)} />
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Period navigator + presupuestos button */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg px-2 py-1.5" style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)' }}>
          <button
            onClick={() => adjustPeriod(-1)}
            className="w-6 h-6 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-400)' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold px-2 whitespace-nowrap" style={{ color: 'var(--color-text-900)', minWidth: 100, textAlign: 'center' }}>
            {MESES[mes - 1]} {anio}
          </span>
          <button
            onClick={() => adjustPeriod(1)}
            className="w-6 h-6 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-400)' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <button
          onClick={() => setShowPresupuestos(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ background: 'var(--color-surface-0)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-700)' }}
        >
          <Banknote size={13} />
          Presupuestos
        </button>
      </div>

      {/* Solicitudes section */}
      <SolicitudesSection mes={mes} anio={anio} />

      {/* Requisiciones section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
            Requisiciones
          </h3>
          <div className="flex items-center gap-2">
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
              {Array.isArray(requisiciones) ? requisiciones.length : 0} total
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <Plus size={15} /> Nueva RQ
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
          </div>
        ) : !Array.isArray(requisiciones) || requisiciones.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-xl"
            style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
          >
            <FileText size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin requisiciones</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>Las RQs generadas desde las solicitudes apareceran aqui</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Numero RQ', 'Categoria', 'C. Costo', 'Lugar', 'Estado', 'Factura', 'Fecha', 'Acciones'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: 'var(--color-text-400)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(requisiciones as RequisicionSummary[]).map((rq) => (
                    <tr
                      key={rq.id}
                      style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}
                    >
                      <td className="px-4 py-3 font-bold" style={{ color: 'var(--color-text-900)' }}>
                        #{rq.numero_rq}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
                        >
                          {CATEGORIA_LABELS[rq.categoria]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-600)' }}>
                        {rq.lote}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-36 truncate" style={{ color: 'var(--color-text-700)' }}>
                        {rq.lugar}
                      </td>
                      <td className="px-4 py-3">
                        <EstadoBadge estado={rq.estado} />
                      </td>
                      <td className="px-4 py-3">
                        {facturadoSet.has(rq.id) ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>
                            Facturada
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}>
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                        {formatDate(rq.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedId(rq.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                            title="Ver detalle"
                            style={{ color: 'var(--color-text-600)', background: 'var(--color-surface-2)' }}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteRq(rq) }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                            title="Eliminar"
                            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showCreate       && <RequisicionModal onClose={() => setShowCreate(false)} />}
      {deleteRq         && <DeleteConfirm rq={deleteRq} onClose={() => setDeleteRq(null)} />}
      {showPresupuestos && <PresupuestosModal onClose={() => setShowPresupuestos(false)} />}
    </div>
  )
}
