'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { formatCOP, formatDateShort as formatDate } from '@/src/lib/utils'
import {
  Plus, Loader2, Eye, Trash2, AlertTriangle, FileText,
  ChevronLeft, ChevronRight, ChevronDown, ClipboardCheck, ExternalLink, CheckCircle2, RotateCcw,
  Pencil, Check, X, Banknote, MapPin, FileSpreadsheet, PenLine,
} from 'lucide-react'
import { fetchFirmaUrl, uploadFirma } from '@/src/lib/firma'
import { getAuthState } from '@/src/stores/auth.store'
import { useRequisiciones, useDeleteRequisicion } from '@/src/hooks/consumables/use-requisiciones'
import { useInformeFacturas } from '@/src/hooks/consumables/use-informe'
import { useSolicitudes, useSolicitud, useGenerarRQs, useSolicitudRequisiciones, useReabrirSolicitud } from '@/src/hooks/consumables/use-solicitudes'
import {
  useFields, useActualizarPresupuesto,
  useFieldLugares, useCreateFieldLugar, useActualizarFieldLugarPresupuesto, useDeleteFieldLugar,
} from '@/src/hooks/reports/use-fields'
import type { Field } from '@/src/types/reports.types'
import { RequisicionDetail } from './requisicion-detail'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { CATEGORIAS, CATEGORIA_LABELS, ESTADO_LABELS } from '@/src/types/consumables.types'
import type {
  Requisicion, RequisicionSummary, CategoriaInsumo, SolicitudItem, GenerarRQsResult, AjusteSolicitadoDto,
} from '@/src/types/consumables.types'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']


const BADGE_COLORS: Record<string, string> = {
  ABIERTA:          '#6b7280',
  COMPLETADA:       '#22c55e',
  PENDIENTE:        '#f59e0b',
  GENERADA:         '#0ea5e9',
  APROBADA:         '#3b82f6',
  PEDIDO_REALIZADO: '#f59e0b',
  EN_BODEGA:        '#0891b2',
  ENTREGADO:        '#16a34a',
}
const BADGE_LABELS: Record<string, string> = {
  ABIERTA:          'Abierta',
  COMPLETADA:       'Completada',
  PENDIENTE:        'Pendiente',
  GENERADA:         'Generada',
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

// ── Modal firma encargado ─────────────────────────────────────────────────────
function EncargadoFirmaModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [mode,       setMode]       = useState<'loading' | 'preview' | 'draw'>('loading')
  const [firmaUrl,   setFirmaUrl]   = useState<string | null>(null)
  const [uploading,  setUploading]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [hasStrokes, setHasStrokes] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)

  useEffect(() => {
    fetchFirmaUrl().then((url) => {
      setFirmaUrl(url)
      setMode(url ? 'preview' : 'draw')
    })
  }, [])

  useEffect(() => {
    if (mode !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasStrokes(false)
  }, [mode])

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    const { x, y } = getPos(e)
    ctx.beginPath(); ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y); ctx.stroke()
    setHasStrokes(true)
  }, [])

  const endDraw = useCallback(() => { drawing.current = false }, [])

  function handleLimpiar() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  async function handleSubirDibujo() {
    if (!hasStrokes) return
    setUploading(true); setError(null)
    try {
      const dataUrl = canvasRef.current!.toDataURL('image/png')
      await uploadFirma(await (await fetch(dataUrl)).blob())
      onConfirm()
    } catch {
      setError('Error al subir la firma. Intentalo de nuevo.')
      setUploading(false)
    }
  }

  return (
    <ModalPortal onClose={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
              Firma requerida
            </p>
            <h2 className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-text-900)' }}>
              Configura tu firma para generar RQs
            </h2>
          </div>
          <button
            type="button" onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Loading */}
          {mode === 'loading' && (
            <div className="flex justify-center py-8">
              <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          )}

          {/* Firma guardada */}
          {mode === 'preview' && firmaUrl && (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-400)' }}>Firma guardada</p>
                <div
                  className="rounded-lg flex items-center justify-center py-3"
                  style={{ background: '#fff', border: '1px solid var(--color-border)' }}
                >
                  <Image src={firmaUrl} alt="Firma" width={300} height={100} style={{ maxHeight: 100, width: 'auto', objectFit: 'contain' }} unoptimized />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setMode('draw'); setError(null) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-80"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
                >
                  <PenLine size={13} /> Dibujar otra
                </button>
                <button
                  type="button" onClick={onConfirm}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                >
                  <ClipboardCheck size={14} /> Usar esta y generar RQs
                </button>
              </div>
            </>
          )}

          {/* Canvas dibujo */}
          {mode === 'draw' && (
            uploading ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>Subiendo firma...</span>
              </div>
            ) : (
              <>
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                  Dibuja tu firma a continuacion. Se guardara en tu perfil para futuras generaciones.
                </p>
                <div style={{ border: '1.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: '#fff', touchAction: 'none' }}>
                  <canvas
                    ref={canvasRef}
                    width={500} height={180}
                    style={{ display: 'block', width: '100%', cursor: 'crosshair', touchAction: 'none' }}
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button" onClick={handleLimpiar}
                    className="px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
                  >
                    Limpiar
                  </button>
                  {firmaUrl && (
                    <button
                      type="button" onClick={() => { setMode('preview'); setError(null) }}
                      className="px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-80"
                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
                    >
                      Volver
                    </button>
                  )}
                  <button
                    type="button" onClick={handleSubirDibujo}
                    disabled={!hasStrokes}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--color-primary)', color: '#fff', opacity: !hasStrokes ? 0.5 : 1 }}
                  >
                    Guardar y generar RQs
                  </button>
                </div>
              </>
            )
          )}

          {error && <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>{error}</p>}

          <button
            type="button" onClick={onCancel}
            className="py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--color-surface-0)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-600)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Revision modal (revisar solicitud completada y generar RQs) ───────────────
function RevisionSolicitudModal({ solicitudId, onClose }: { solicitudId: string; onClose: () => void }) {
  const { data: solicitud, isLoading } = useSolicitud(solicitudId)
  const { data: rqsExistentes = [] } = useSolicitudRequisiciones(solicitudId)
  const generar = useGenerarRQs()
  const reabrir = useReabrirSolicitud()
  const [numeros,       setNumeros]       = useState<Partial<Record<CategoriaInsumo, string>>>({})
  const [result,        setResult]        = useState<GenerarRQsResult | null>(null)
  const [cantidades,    setCantidades]    = useState<Record<string, string>>({})
  const [showFirmaModal, setShowFirmaModal] = useState(false)
  const [firmaChecking,  setFirmaChecking]  = useState(false)

  useEffect(() => {
    if (!solicitud) return
    const init: Record<string, string> = {}
    for (const catData of solicitud.categorias ?? []) {
      for (const item of catData.items) {
        if ((item.solicitado ?? 0) > 0) init[item.id] = String(parseInt(String(item.solicitado ?? 0), 10))
      }
    }
    setCantidades(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const porCategoria: Record<CategoriaInsumo, SolicitudItem[]> = { PAPELERIA: [], CONSUMIBLE: [], EPP: [], DOTACION: [] }
  for (const catData of (solicitud.categorias ?? [])) {
    porCategoria[catData.categoria] = catData.items
      .filter(i => (i.solicitado ?? 0) > 0)
      .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }))
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

  // Muestra la categoria si tiene items originales (no desaparece al editar a 0)
  const categoriasConItems = CATEGORIAS.filter((c) => porCategoria[c].length > 0)
  // Solo las categorias con al menos un item con cantidad > 0 (para asignar numero RQ)
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

  async function handleGenerarClick() {
    setFirmaChecking(true)
    const url = await fetchFirmaUrl()
    setFirmaChecking(false)
    if (!url) { setShowFirmaModal(true) } else { handleGenerar() }
  }

  const allFilled = categoriasConItems.every((c) => numeros[c] && Number(numeros[c]) > 0)
  const numerosIngresados = categoriasConItems.map((c) => Number(numeros[c])).filter(Boolean)
  const hayRepetidos = numerosIngresados.length !== new Set(numerosIngresados).size
  const hayItemsEnCero = categoriasConItems.some((c) =>
    porCategoria[c].some((i) => cantidadAjustada(i) <= 0),
  )

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
                <EstadoBadge estado={rq.estado} />
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
                              <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--color-text-900)', minWidth: 200 }}>
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
                        background: 'rgba(99,102,241,0.12)',
                        color: '#4338ca',
                      }}
                    >
                      Tope: {formatCOP(solicitud.presupuesto)}
                    </span>
                  )}
                  {solicitud.presupuesto != null && (() => {
                    const totalVal = categoriasConItems.reduce((sum, cat) => sum + subtotalCategoria(cat), 0)
                    return <DiferenciaBadge presupuesto={solicitud.presupuesto} total={totalVal} />
                  })()}
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
          {hayItemsEnCero && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626' }}
            >
              <AlertTriangle size={12} className="shrink-0" />
              Hay insumos con cantidad 0 o vacia — todos deben tener cantidad mayor a 0
            </div>
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
          {hayRepetidos && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626' }}
            >
              <AlertTriangle size={12} className="shrink-0" />
              Los numeros de RQ no pueden repetirse entre categorias
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
                onClick={handleGenerarClick}
                disabled={generar.isPending || firmaChecking || !allFilled || hayRepetidos || hayItemsEnCero}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-opacity"
                style={{
                  background: allFilled && !hayRepetidos && !hayItemsEnCero ? 'var(--color-primary)' : '#9ca3af',
                  color: '#fff',
                  opacity: (generar.isPending || firmaChecking) ? 0.75 : 1,
                  cursor: allFilled && !hayRepetidos && !hayItemsEnCero ? 'pointer' : 'not-allowed',
                }}
              >
                {(generar.isPending || firmaChecking) ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                {generar.isPending ? 'Generando...' : firmaChecking ? 'Verificando...' : 'Generar RQs'}
              </button>
            )}
          </div>
        </div>
      </div>
      {showFirmaModal && (
        <EncargadoFirmaModal
          onConfirm={() => { setShowFirmaModal(false); handleGenerar() }}
          onCancel={() => setShowFirmaModal(false)}
        />
      )}
    </ModalPortal>
  )
}

// ── Excel multi-RQ export ─────────────────────────────────────────────────────
async function exportExcelUnificado(rqs: Requisicion[]) {
  const [excelModule, { fetchLogoBuffer }] = await Promise.all([
    import('exceljs'),
    import('@/src/lib/report-header'),
  ])
  const ExcelJS = (excelModule as { default?: typeof excelModule }).default ?? excelModule
  const wb      = new ExcelJS.Workbook()
  const logoBuf = await fetchLogoBuffer('/assets/logo-full.png')

  const encargadoFirmaUrl = await fetchFirmaUrl()
  const encargadoUserU    = getAuthState().user
  const encargadoNombreU  = encargadoUserU ? `${encargadoUserU.first_name} ${encargadoUserU.last_name}` : ''
  async function fetchBuf(url: string): Promise<ArrayBuffer | null> {
    try { const r = await fetch(url); return r.ok ? r.arrayBuffer() : null } catch { return null }
  }

  const copFmt     = '"$"#,##0'
  const thin       = { style: 'thin' } as const
  const allBorders = { top: thin, bottom: thin, left: thin, right: thin }

  for (const rq of rqs) {
    const hasFactura = rq.items.some((i) => i.numero_factura !== null || i.precio_real !== null)

    const HEADERS = hasFactura
      ? ['Codigo','Descripcion','Unidad','Proveedor Ord.','Proveedor Ext.','Valor Unitario','Cantidad','Total','N. Factura','V. Real','Diferencia','Prov. Real']
      : ['Codigo','Descripcion','Unidad','Proveedor Ord.','Proveedor Ext.','Valor Unitario','Cantidad','Total']
    const COL_WIDTHS = hasFactura
      ? [14, 38, 10, 22, 22, 18, 12, 18, 18, 18, 18, 22]
      : [14, 38, 10, 22, 22, 18, 12, 18]
    const numCols = HEADERS.length

    const ws = wb.addWorksheet(`RQ-${rq.numero_rq}`)
    ws.columns = COL_WIDTHS.map((width) => ({ width }))

    // Row 1: logo header (solo Servicios Asociados)
    ws.getRow(1).height = 68
    ws.mergeCells(1, 2, 1, numCols)
    const titleCell     = ws.getCell(1, 2)
    titleCell.value     = `SERVICIOS ASOCIADOS SAS.\nREQUISICION DE INSUMOS  |  RQ #${rq.numero_rq}  |  ${CATEGORIA_LABELS[rq.categoria]}\nCC: ${rq.lote}  |  Lugar: ${rq.lugar}`
    titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    titleCell.font      = { bold: true, size: 10 }

    if (logoBuf) {
      const id = wb.addImage({ buffer: logoBuf, extension: 'png' })
      ws.addImage(id, { tl: { col: 0.05, row: 0.05 }, br: { col: 1.9, row: 0.95 } })
    }

    // Row 2: blue separator
    ws.getRow(2).height = 4
    for (let c = 1; c <= numCols; c++) {
      ws.getCell(2, c).border = { bottom: { style: 'medium', color: { argb: 'FF1E4A8A' } } }
    }

    // Row 3: info block
    ws.getRow(3).height = 18
    ws.mergeCells(3, 1, 3, 4)
    ws.getCell(3, 1).value     = `Solicitante: ${rq.nombre_solicitante ?? '-'}   |   Contrato: ${rq.numero_contrato ?? '-'}`
    ws.getCell(3, 1).font      = { size: 10 }
    ws.getCell(3, 1).alignment = { vertical: 'middle' }
    ws.mergeCells(3, 5, 3, numCols)
    ws.getCell(3, 5).value     = `Fecha: ${rq.fecha ?? '-'}   |   Estado: ${ESTADO_LABELS[rq.estado]}`
    ws.getCell(3, 5).font      = { size: 10 }
    ws.getCell(3, 5).alignment = { vertical: 'middle' }

    // Row 4: column headers
    const hdrRow = ws.getRow(4)
    hdrRow.height = 26
    HEADERS.forEach((h, i) => {
      const cell     = hdrRow.getCell(i + 1)
      cell.value     = h
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } }
      cell.font      = { bold: true, size: 10, color: { argb: 'FF000000' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border    = allBorders
    })

    // Data rows
    for (let ri = 0; ri < rq.items.length; ri++) {
      const item    = rq.items[ri]
      const rowNum  = 5 + ri
      const row     = ws.getRow(rowNum)
      row.height    = 18
      const bgColor = ri % 2 !== 0 ? 'FFF3F4F6' : 'FFFFFFFF'

      const diff = item.precio_real != null && item.valor_unitario !== null && item.solicitado !== null
        ? (item.precio_real - item.valor_unitario) * item.solicitado
        : null

      const cols = [
        { v: item.codigo,                          align: 'left',   numFmt: null   },
        { v: item.descripcion,                     align: 'left',   numFmt: null   },
        { v: item.unidad,                          align: 'center', numFmt: null   },
        { v: item.proveedor_ordinario     ?? '',   align: 'left',   numFmt: null   },
        { v: item.proveedor_extraordinario ?? '',  align: 'left',   numFmt: null   },
        { v: item.valor_unitario          ?? '',   align: 'right',  numFmt: copFmt },
        { v: item.solicitado              ?? '',   align: 'center', numFmt: null   },
        { v: item.total                   ?? '',   align: 'right',  numFmt: copFmt },
        ...(hasFactura ? [
          { v: item.numero_factura        ?? '',   align: 'left',   numFmt: null   },
          { v: item.precio_real           ?? '',   align: 'right',  numFmt: copFmt },
          { v: diff                       ?? '',   align: 'right',  numFmt: copFmt },
          { v: item.proveedor_factura     ?? '',   align: 'left',   numFmt: null   },
        ] : []),
      ]
      cols.forEach(({ v, align, numFmt }, ci) => {
        const cell     = row.getCell(ci + 1)
        cell.value     = v
        cell.alignment = { vertical: 'middle', horizontal: align as 'left' | 'center' | 'right', wrapText: true }
        cell.border    = allBorders
        cell.font      = { size: 10 }
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
        if (numFmt) cell.numFmt = numFmt
      })
    }

    // Total row
    const totalRowNum = 5 + rq.items.length
    const totalRow    = ws.getRow(totalRowNum)
    totalRow.height   = 22
    const grayFill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } } as const
    const estimado    = rq.items.reduce((sum, i) => sum + (i.solicitado ?? 0) * (i.valor_unitario ?? 0), 0)

    if (hasFactura) {
      // Estimated: cols 1-7 label, col 8 value
      ws.mergeCells(totalRowNum, 1, totalRowNum, 7)
      const lbl = totalRow.getCell(1)
      lbl.value = 'TOTAL GENERAL'; lbl.font = { bold: true, size: 11 }; lbl.alignment = { horizontal: 'right', vertical: 'middle' }; lbl.border = allBorders; lbl.fill = grayFill
      const tot = totalRow.getCell(8)
      tot.value = estimado; tot.numFmt = copFmt; tot.font = { bold: true, size: 11 }; tot.alignment = { horizontal: 'right', vertical: 'middle' }; tot.border = allBorders; tot.fill = grayFill
      // Real: col 9 label, col 10 value
      const realTotalVal = rq.items.reduce((sum, i) => (i.precio_real != null && i.solicitado != null ? sum + i.precio_real * i.solicitado : sum), 0)
      const realLbl = totalRow.getCell(9)
      realLbl.value = 'TOTAL REAL'; realLbl.font = { bold: true, size: 11 }; realLbl.alignment = { horizontal: 'right', vertical: 'middle' }; realLbl.border = allBorders; realLbl.fill = grayFill
      const realTot = totalRow.getCell(10)
      realTot.value = realTotalVal; realTot.numFmt = copFmt; realTot.font = { bold: true, size: 11 }; realTot.alignment = { horizontal: 'right', vertical: 'middle' }; realTot.border = allBorders; realTot.fill = grayFill
      for (const c of [11, 12]) { const cell = totalRow.getCell(c); cell.border = allBorders; cell.fill = grayFill }
    } else {
      ws.mergeCells(totalRowNum, 1, totalRowNum, numCols - 1)
      const lbl     = totalRow.getCell(1)
      lbl.value     = 'TOTAL GENERAL'
      lbl.font      = { bold: true, size: 11 }
      lbl.alignment = { horizontal: 'right', vertical: 'middle' }
      lbl.border    = allBorders
      lbl.fill      = grayFill
      const tot     = totalRow.getCell(numCols)
      tot.value     = estimado
      tot.numFmt    = copFmt
      tot.font      = { bold: true, size: 11 }
      tot.alignment = { horizontal: 'right', vertical: 'middle' }
      tot.border    = allBorders
      tot.fill      = grayFill
    }

    // Signature section
    const midCol       = Math.floor(numCols / 2)
    const sigHdrRow    = totalRowNum + 2
    const sigNombreRow = sigHdrRow + 1
    const sigFirmaStart = sigNombreRow + 1
    const sigFirmaEnd   = sigFirmaStart + 4
    const grayHdrFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } } as const

    ws.getRow(totalRowNum + 1).height = 8
    ws.getRow(sigHdrRow).height = 14
    ws.getRow(sigNombreRow).height = 16
    for (let r = sigFirmaStart; r <= sigFirmaEnd; r++) ws.getRow(r).height = 18

    ws.mergeCells(sigHdrRow, 1, sigHdrRow, midCol)
    const supHdr = ws.getCell(sigHdrRow, 1)
    supHdr.value = 'RESPONSABLE SOLICITUD'; supHdr.font = { bold: true, size: 10 }
    supHdr.alignment = { horizontal: 'center', vertical: 'middle' }; supHdr.fill = grayHdrFill; supHdr.border = allBorders

    ws.mergeCells(sigHdrRow, midCol + 1, sigHdrRow, numCols)
    const encHdr = ws.getCell(sigHdrRow, midCol + 1)
    encHdr.value = 'RESPONSABLE AUTORIZACION'; encHdr.font = { bold: true, size: 10 }
    encHdr.alignment = { horizontal: 'center', vertical: 'middle' }; encHdr.fill = grayHdrFill; encHdr.border = allBorders

    ws.mergeCells(sigNombreRow, 1, sigNombreRow, midCol)
    const supNom = ws.getCell(sigNombreRow, 1)
    supNom.value = `Nombre: ${rq.nombre_solicitante ?? ''}`; supNom.font = { size: 10 }
    supNom.alignment = { horizontal: 'left', vertical: 'middle' }; supNom.border = allBorders

    ws.mergeCells(sigNombreRow, midCol + 1, sigNombreRow, numCols)
    const encNom = ws.getCell(sigNombreRow, midCol + 1)
    encNom.value = `Nombre: ${encargadoNombreU}`; encNom.font = { size: 10 }
    encNom.alignment = { horizontal: 'left', vertical: 'middle' }; encNom.border = allBorders

    for (let r = sigFirmaStart; r <= sigFirmaEnd; r++) {
      ws.mergeCells(r, 1, r, midCol)
      ws.getCell(r, 1).border = allBorders
      ws.mergeCells(r, midCol + 1, r, numCols)
      ws.getCell(r, midCol + 1).border = allBorders
    }

    if (rq.firma_supervisor_url) {
      const buf2 = await fetchBuf(rq.firma_supervisor_url)
      if (buf2) {
        const imgId = wb.addImage({ buffer: buf2, extension: 'png' })
        ws.addImage(imgId, { tl: { col: 0.1, row: sigFirmaStart - 0.9 }, br: { col: midCol - 0.1, row: sigFirmaEnd - 0.1 } })
      }
    }
    if (encargadoFirmaUrl) {
      const buf2 = await fetchBuf(encargadoFirmaUrl)
      if (buf2) {
        const imgId = wb.addImage({ buffer: buf2, extension: 'png' })
        ws.addImage(imgId, { tl: { col: midCol + 0.1, row: sigFirmaStart - 0.9 }, br: { col: numCols - 0.1, row: sigFirmaEnd - 0.1 } })
      }
    }
  }

  const lugar    = rqs[0]?.lugar ?? 'RQs'
  const fechaStr = new Date().toLocaleDateString('es-CO').replace(/\//g, '-')
  const buf  = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `RQs_${lugar}_${fechaStr}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
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
  const [newLote,         setNewLote]         = useState('')

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
    const lote = newLote.trim() !== '' ? Number(newLote.trim()) : undefined
    createLugar.mutate(
      { fieldId: field.id, nombre: newNombre.trim(), lote },
      { onSuccess: () => { setNewNombre(''); setNewLote(''); setShowAdd(false) } },
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
                  <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--color-text-600)' }}>{lugar.lote}</td>
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
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus type="text" value={newNombre}
                        onChange={(e) => setNewNombre(e.target.value)}
                        placeholder="Nombre del lugar"
                        className="rounded-lg text-xs outline-none flex-1"
                        style={{ border: '1.5px solid var(--color-secondary)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', padding: '5px 9px' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddLugar()
                          if (e.key === 'Escape') { setShowAdd(false); setNewNombre(''); setNewLote('') }
                        }}
                      />
                      <input
                        type="text" inputMode="numeric" value={newLote}
                        onChange={(e) => { if (/^\d*$/.test(e.target.value)) setNewLote(e.target.value) }}
                        placeholder="C. Costo (opc.)"
                        className="rounded-lg text-xs outline-none"
                        style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', padding: '5px 9px', width: 130 }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddLugar()
                          if (e.key === 'Escape') { setShowAdd(false); setNewNombre(''); setNewLote('') }
                        }}
                      />
                    </div>
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
                        onClick={() => { setShowAdd(false); setNewNombre(''); setNewLote('') }}
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

function DiferenciaBadge({ presupuesto, total }: { presupuesto: number | null | undefined; total: number | null | undefined }) {
  if (presupuesto == null || total == null) return null
  const diff  = presupuesto - total
  const over  = diff < 0
  const close = !over && presupuesto > 0 && diff / presupuesto < 0.1
  const color = over ? '#dc2626' : close ? '#d97706' : '#15803d'
  const bg    = over ? 'rgba(220,38,38,0.1)' : close ? 'rgba(217,119,6,0.1)' : 'rgba(21,128,61,0.1)'
  const label = over ? 'Saldo en contra' : 'Saldo a favor'
  return (
    <span
      className="inline-flex flex-col items-end px-2 py-0.5 rounded-lg whitespace-nowrap"
      style={{ background: bg, color }}
    >
      <span style={{ fontSize: 9, fontWeight: 600, lineHeight: 1.3, opacity: 0.9 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>{formatCOP(Math.abs(diff))}</span>
    </span>
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
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
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
                {['Planta', 'C. Costo', 'Presupuesto', 'Total', 'Diferencia', 'Estado', 'Acciones'].map((h) => (
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
                      <td className="px-4 py-3 text-xs font-semibold" style={{ color: s.total_general != null ? 'var(--color-text-900)' : 'var(--color-text-300)' }}>
                        {s.total_general != null ? formatCOP(s.total_general) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <DiferenciaBadge presupuesto={s.presupuesto} total={s.total_general} />
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
                        <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: child.total_general != null ? 'var(--color-text-900)' : 'var(--color-text-300)' }}>
                          {child.total_general != null ? formatCOP(child.total_general) : '-'}
                        </td>
                        <td className="px-4 py-2.5">
                          <DiferenciaBadge presupuesto={child.presupuesto} total={child.total_general} />
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
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: s.total_general != null ? 'var(--color-text-900)' : 'var(--color-text-300)' }}>
                    {s.total_general != null ? formatCOP(s.total_general) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <DiferenciaBadge presupuesto={s.presupuesto} total={s.total_general} />
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
  const [deleteRq,         setDeleteRq]         = useState<RequisicionSummary | null>(null)
  const [selectedId,       setSelectedId]       = useState<string | null>(null)
  const [showPresupuestos, setShowPresupuestos] = useState(false)
  const [selectionMode,    setSelectionMode]    = useState(false)
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set())
  const [loadingDownload,  setLoadingDownload]  = useState(false)

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  async function handleDownloadUnificado() {
    const { api } = await import('@/src/lib/axios')
    setLoadingDownload(true)
    try {
      const rqsData = await Promise.all(
        [...selectedIds].map((id) => api.get<Requisicion>(`/requisiciones/${id}`).then((r) => r.data)),
      )
      await exportExcelUnificado(rqsData)
    } finally {
      setLoadingDownload(false)
    }
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
            {!selectionMode && Array.isArray(requisiciones) && requisiciones.length > 0 && (
              <button
                onClick={() => setSelectionMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-surface-0)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-700)' }}
              >
                <FileSpreadsheet size={12} />
                Seleccionar
              </button>
            )}
          </div>
        </div>

        {/* Selection bar - visible only in selection mode */}
        {selectionMode && (() => {
          const sel = (requisiciones as RequisicionSummary[]).filter((rq) => selectedIds.has(rq.id))
          const lugares = new Set(sel.map((rq) => rq.lugar))
          const mismoLugar = lugares.size === 1
          return (
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl flex-wrap"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
            >
              <span className="text-xs font-semibold flex-1 min-w-0" style={{ color: 'var(--color-text-900)' }}>
                {selectedIds.size === 0
                  ? 'Selecciona las RQs que quieres descargar'
                  : `${selectedIds.size} RQ${selectedIds.size !== 1 ? 's' : ''} seleccionada${selectedIds.size !== 1 ? 's' : ''}`}
                {selectedIds.size > 0 && mismoLugar && (
                  <span className="ml-1.5 font-normal" style={{ color: 'var(--color-text-400)' }}>
                    &middot; {[...lugares][0]}
                  </span>
                )}
              </span>
              {selectedIds.size > 0 && !mismoLugar && (
                <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                  Lugares distintos - selecciona RQs del mismo lugar
                </span>
              )}
              {selectedIds.size > 0 && mismoLugar && (
                <button
                  onClick={handleDownloadUnificado}
                  disabled={loadingDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--color-primary)', color: '#fff', opacity: loadingDownload ? 0.6 : 1 }}
                >
                  {loadingDownload ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />}
                  {loadingDownload ? 'Generando...' : 'Descargar Excel unificado'}
                </button>
              )}
              <button
                onClick={() => { setSelectionMode(false); setSelectedIds(new Set()) }}
                className="text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-70 transition-opacity"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
              >
                Cancelar
              </button>
            </div>
          )
        })()}

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
                    {selectionMode && (
                      <th className="px-3 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size > 0 && selectedIds.size === (requisiciones as RequisicionSummary[]).length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(new Set((requisiciones as RequisicionSummary[]).map((r) => r.id)))
                            else setSelectedIds(new Set())
                          }}
                          className="rounded"
                          style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                        />
                      </th>
                    )}
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
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: selectedIds.has(rq.id) ? 'var(--color-surface-1)' : 'var(--color-surface-0)',
                      }}
                    >
                      {selectionMode && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(rq.id)}
                            onChange={() => toggleSelect(rq.id)}
                            style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                          />
                        </td>
                      )}
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

      {deleteRq         && <DeleteConfirm rq={deleteRq} onClose={() => setDeleteRq(null)} />}
      {showPresupuestos && <PresupuestosModal onClose={() => setShowPresupuestos(false)} />}
    </div>
  )
}
