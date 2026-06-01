'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, Send, Clock, Search, Eye, X, Plus, Pencil, Trash2, PenLine, FileText, Package } from 'lucide-react'
import {
  useMisSolicitudes, useSolicitud, useLlenarMiSolicitud, useSolicitudRequisiciones,
  useCrearAdicional, useEditarAdicional, useEliminarAdicional, useCrearSolicitudAdicional,
} from '@/src/hooks/consumables/use-solicitudes'
import { useRequisicion } from '@/src/hooks/consumables/use-requisiciones'
import { RecepcionModal } from '../supervisor/recepcion-modal'
import { useFieldLugares } from '@/src/hooks/reports/use-fields'
import { useAuthStore } from '@/src/stores/auth.store'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { CATEGORIAS, CATEGORIA_LABELS } from '@/src/types/consumables.types'
import type { CategoriaInsumo, SolicitudItem } from '@/src/types/consumables.types'
import { fetchFirmaUrl, uploadFirma, getCargo, saveCargo } from '@/src/lib/firma'
import { generarPdfsSolicitud } from '@/src/lib/solicitud-pdf'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type CantidadMap = Record<string, string>

function formatCOP(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value))
}

/* ─────────────── RQPreviewModal ─────────────── */

function RQPreviewModal({ rqId, onClose }: { rqId: string; onClose: () => void }) {
  const { data: rq, isLoading } = useRequisicion(rqId)
  const isEntregado = rq?.estado === 'ENTREGADO' || rq?.recepcion_completada
  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.25)', maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-3.5 flex items-center justify-between gap-3 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <div>
            {rq && (
              <>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                  RQ #{rq.numero_rq} - {CATEGORIA_LABELS[rq.categoria]}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                  {rq.lugar} - CC {rq.lote}
                  {isEntregado && rq.fecha_entrega && (
                    <> &middot; Recibido el <strong style={{ color: 'var(--color-text-700)' }}>{rq.fecha_entrega}</strong></>
                  )}
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity shrink-0"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : !rq ? null : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Codigo', 'Descripcion', 'Unidad', 'Solicitado'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: 'var(--color-text-400)' }}
                      >
                        {h}
                      </th>
                    ))}
                    {isEntregado && (
                      <>
                        <th
                          className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                          style={{ color: '#16a34a', borderLeft: '2px solid var(--color-border)' }}
                        >
                          Recibido
                        </th>
                        <th
                          className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                          style={{ color: 'var(--color-text-400)' }}
                        >
                          Diferencia
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...rq.items].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' })).map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                        {item.codigo}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--color-text-900)', minWidth: 200 }}>
                        {item.descripcion}
                      </td>
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                        {item.unidad}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold text-center whitespace-nowrap" style={{ color: item.solicitado != null ? 'var(--color-text-900)' : 'var(--color-text-400)' }}>
                        {item.solicitado != null ? Math.round(Number(item.solicitado)) : '-'}
                      </td>
                      {isEntregado && (() => {
                        const sol   = Math.round(Number(item.solicitado ?? 0))
                        const rec   = Math.round(Number(item.recibido   ?? 0))
                        const diff  = rec - sol
                        const recColor  = rec === sol ? '#16a34a' : rec < sol ? '#ef4444' : '#3b82f6'
                        const diffColor = diff === 0  ? '#16a34a' : diff < 0  ? '#ef4444' : '#3b82f6'
                        return (
                          <>
                            <td className="px-4 py-2.5 text-xs font-bold text-center whitespace-nowrap" style={{ color: recColor, borderLeft: '2px solid var(--color-border)' }}>
                              {rec}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-bold text-center whitespace-nowrap" style={{ color: diffColor }}>
                              {diff === 0 ? '=' : (diff > 0 ? '+' : '') + diff}
                            </td>
                          </>
                        )
                      })()}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--color-surface-1)', borderTop: '2px solid var(--color-border)' }}>
                    <td colSpan={isEntregado ? 6 : 4} className="px-4 py-2.5 text-xs" style={{ color: 'var(--color-text-400)' }}>
                      {rq.items.length} item{rq.items.length !== 1 ? 's' : ''}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

/* ─────────────── AdicionalModal ─────────────── */

function AdicionalModal({
  solicitudId,
  catDefault,
  item,
  onClose,
}: {
  solicitudId: string
  catDefault: CategoriaInsumo
  item: SolicitudItem | null
  onClose: () => void
}) {
  const [descripcion, setDescripcion] = useState(item?.descripcion ?? '')
  const [unidad,      setUnidad]      = useState(item?.unidad      ?? '')
  const [proveedor,   setProveedor]   = useState(item?.proveedor   ?? '')
  const [valor,       setValor]       = useState(item?.valor_unitario != null ? String(item.valor_unitario) : '')
  const [cantidad,    setCantidad]    = useState(item?.solicitado   != null ? String(item.solicitado)      : '')
  const [categoria,   setCategoria]   = useState<CategoriaInsumo>(catDefault)

  const crear  = useCrearAdicional(solicitudId)
  const editar = useEditarAdicional(solicitudId)
  const isPending = crear.isPending || editar.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (item) {
      editar.mutate(
        { adicionalId: item.id, data: { descripcion, unidad, proveedor, valor_unitario: Number(valor), solicitado: Number(cantidad) } },
        { onSuccess: onClose },
      )
    } else {
      crear.mutate(
        { descripcion, unidad, proveedor, valor_unitario: Number(valor), solicitado: Number(cantidad), categoria },
        { onSuccess: onClose },
      )
    }
  }

  const inputCls = 'rounded-lg text-sm outline-none px-3 py-2 w-full'
  const inputStyle: React.CSSProperties = { border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }
  const onFocusAmber = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'var(--color-secondary)' }
  const onBlurBorder = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'var(--color-border)' }

  return (
    <ModalPortal onClose={() => !isPending && onClose()}>
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
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#d97706' }}>
              Insumo adicional
            </p>
            <h2 className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-text-900)' }}>
              {item ? 'Editar adicional' : 'Agregar adicional'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !isPending && onClose()}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Categoria - solo al crear */}
          {!item && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Categoria</label>
              <div className="flex gap-2">
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoria(cat)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={
                      categoria === cat
                        ? { background: 'var(--color-primary)', color: '#fff' }
                        : { background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }
                    }
                  >
                    {CATEGORIA_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Descripcion *</label>
            <input
              required value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripcion del insumo" className={inputCls} style={inputStyle}
              onFocus={onFocusAmber} onBlur={onBlurBorder}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Unidad *</label>
              <input
                required value={unidad} onChange={(e) => setUnidad(e.target.value)}
                placeholder="UND, KG, L..." className={inputCls} style={inputStyle}
                onFocus={onFocusAmber} onBlur={onBlurBorder}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Cantidad *</label>
              <input
                required type="number" min="1" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
                placeholder="0" className={inputCls} style={inputStyle}
                onFocus={onFocusAmber} onBlur={onBlurBorder}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Proveedor *</label>
            <input
              required value={proveedor} onChange={(e) => setProveedor(e.target.value)}
              placeholder="Nombre del proveedor" className={inputCls} style={inputStyle}
              onFocus={onFocusAmber} onBlur={onBlurBorder}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Valor unitario (COP) *</label>
            <input
              required type="number" min="0" step="1" value={valor} onChange={(e) => setValor(e.target.value)}
              placeholder="0" className={inputCls} style={inputStyle}
              onFocus={onFocusAmber} onBlur={onBlurBorder}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={() => !isPending && onClose()} disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--color-surface-0)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-600)', opacity: isPending ? 0.5 : 1 }}
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: '#d97706', color: '#fff', opacity: isPending ? 0.6 : 1 }}
            >
              {isPending && <Loader2 size={15} className="animate-spin" />}
              {item ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  )
}

/* ─────────────── FirmaStepModal ─────────────── */

function InlineCanvas({ cargo, onCargoChange, onGuardar }: {
  cargo: string
  onCargoChange: (v: string) => void
  onGuardar: (dataUrl: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#111'
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
  }, [])

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
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Cargo *</label>
        <input
          value={cargo}
          onChange={(e) => onCargoChange(e.target.value)}
          placeholder="Ej: Supervisor de Planta"
          className="rounded-lg text-sm outline-none px-3 py-2"
          style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-900)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
          onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Firma *</label>
        <div style={{ border: '1.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: '#fff', touchAction: 'none' }}>
          <canvas
            ref={canvasRef}
            width={500}
            height={180}
            style={{ display: 'block', width: '100%', cursor: 'crosshair', touchAction: 'none' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleLimpiar}
          className="px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={() => { if (hasStrokes && cargo.trim()) onGuardar(canvasRef.current!.toDataURL('image/png')) }}
          disabled={!hasStrokes || !cargo.trim()}
          className="flex-1 py-2 rounded-lg text-xs font-bold"
          style={{ background: 'var(--color-primary)', color: '#fff', opacity: (!hasStrokes || !cargo.trim()) ? 0.5 : 1 }}
        >
          Usar esta firma
        </button>
      </div>
    </div>
  )
}

function FirmaStepModal({
  userId,
  userPosition,
  onConfirm,
  onCancel,
}: {
  userId: string
  userPosition: string
  onConfirm: (firmaUrl: string, cargo: string) => void
  onCancel: () => void
}) {
  const [mode,      setMode]      = useState<'loading' | 'preview' | 'draw'>('loading')
  const [firmaUrl,  setFirmaUrl]  = useState<string | null>(null)
  const [cargo,     setCargo]     = useState(userPosition ?? '')
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    fetchFirmaUrl().then((url) => {
      const saved = getCargo(userId)
      if (saved) setCargo(saved)
      setFirmaUrl(url)
      setMode(url ? 'preview' : 'draw')
    })
  }, [userId])

  function handleUsarGuardada() {
    if (!firmaUrl || !cargo.trim()) return
    saveCargo(userId, cargo.trim())
    onConfirm(firmaUrl, cargo.trim())
  }

  async function handleNuevaFirma(dataUrl: string) {
    setUploading(true)
    setError(null)
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const url  = await uploadFirma(blob)
      saveCargo(userId, cargo.trim())
      onConfirm(url, cargo.trim())
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
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>Firma</p>
            <h2 className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-text-900)' }}>
              Confirmar con firma
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
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

          {/* Firma guardada en servidor */}
          {mode === 'preview' && firmaUrl && (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-400)' }}>Firma guardada</p>
                <div
                  className="rounded-lg flex items-center justify-center py-3"
                  style={{ background: '#fff', border: '1px solid var(--color-border)' }}
                >
                  <img src={firmaUrl} alt="Firma" style={{ maxHeight: 100, objectFit: 'contain' }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Cargo</label>
                  <input
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Ej: Supervisor de Planta"
                    className="rounded-lg text-sm outline-none px-3 py-2"
                    style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-900)' }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                    onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setMode('draw'); setError(null) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-80"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
                >
                  <PenLine size={13} />
                  Dibujar otra
                </button>
                <button
                  type="button"
                  onClick={handleUsarGuardada}
                  disabled={!cargo.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold"
                  style={{ background: 'var(--color-primary)', color: '#fff', opacity: !cargo.trim() ? 0.5 : 1 }}
                >
                  <Send size={14} />
                  Usar esta firma
                </button>
              </div>
            </>
          )}

          {/* Canvas para dibujar */}
          {mode === 'draw' && (
            uploading ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>Subiendo firma...</span>
              </div>
            ) : (
              <>
                <InlineCanvas cargo={cargo} onCargoChange={setCargo} onGuardar={handleNuevaFirma} />
                {firmaUrl && (
                  <button
                    type="button"
                    onClick={() => { setMode('preview'); setError(null) }}
                    className="text-xs hover:opacity-75"
                    style={{ color: 'var(--color-text-400)', textAlign: 'left' }}
                  >
                    Volver a la firma guardada
                  </button>
                )}
              </>
            )
          )}

          {error && (
            <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>{error}</p>
          )}

          <button
            type="button"
            onClick={onCancel}
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

/* ─────────────── ProgressModal ─────────────── */

type ProgressStep = 'sending' | 'generating' | 'done'

const STEP_LABEL: Record<ProgressStep, { label: string; sub: string }> = {
  sending:    { label: 'Enviando solicitud',  sub: 'Registrando los datos en el servidor...' },
  generating: { label: 'Generando PDFs',      sub: 'Preparando los documentos de solicitud...' },
  done:       { label: 'Solicitud enviada',   sub: 'Los documentos fueron generados correctamente.' },
}

// Techo por paso: la barra nunca supera este valor mientras el paso siga activo
const STEP_CAP: Record<ProgressStep, number> = {
  sending:    46,
  generating: 88,
  done:       100,
}

const STEPS: ProgressStep[] = ['sending', 'generating', 'done']

function ProgressModal({ step }: { step: ProgressStep }) {
  const [pct, setPct] = useState(0)
  const cap = STEP_CAP[step]
  const isDone = step === 'done'

  // Incremento continuo con desaceleracion exponencial hacia el techo del paso actual
  useEffect(() => {
    const id = setInterval(() => {
      setPct((cur) => {
        const gap = cap - cur
        if (gap <= 0.05) return cur
        const inc = Math.max(0.18, gap * 0.042)
        return Math.min(cap, cur + inc)
      })
    }, 48)
    return () => clearInterval(id)
  }, [cap])

  const display = Math.min(100, Math.round(pct))

  return (
    <ModalPortal onClose={() => {}}>
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-5">

          {/* Icono */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: isDone ? '#dcfce7' : 'var(--color-surface-2)' }}
          >
            {isDone
              ? <CheckCircle2 size={28} style={{ color: '#16a34a' }} />
              : <FileText size={28} style={{ color: 'var(--color-primary)' }} />
            }
          </div>

          {/* Texto */}
          <div className="text-center flex flex-col gap-1">
            <p className="text-sm font-bold" style={{ color: 'var(--color-text-900)' }}>
              {STEP_LABEL[step].label}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
              {STEP_LABEL[step].sub}
            </p>
          </div>

          {/* Barra de progreso */}
          <div className="w-full flex flex-col gap-2">
            <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: 'var(--color-surface-2)' }}>
              <div
                style={{
                  height: '100%',
                  width: `${display}%`,
                  background: isDone ? '#16a34a' : 'var(--color-primary)',
                  borderRadius: 9999,
                  transition: 'background 0.3s',
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                {isDone ? 'Completado' : 'En progreso...'}
              </span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-text-600)' }}>
                {display}%
              </span>
            </div>
          </div>

          {/* Steps */}
          <div className="w-full flex flex-col gap-2 pt-1">
            {STEPS.map((s, idx) => {
              const stepIdx    = STEPS.indexOf(step)
              const sIdx       = idx
              const isActive   = s === step
              const isComplete = sIdx < stepIdx
              return (
                <div key={s} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={
                      isComplete
                        ? { background: '#16a34a', color: '#fff' }
                        : isActive
                        ? { background: 'var(--color-primary)', color: '#fff' }
                        : { background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }
                    }
                  >
                    {isComplete ? <CheckCircle2 size={12} /> : idx + 1}
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: isActive ? 'var(--color-text-900)' : isComplete ? '#16a34a' : 'var(--color-text-400)' }}
                  >
                    {STEP_LABEL[s].label}
                  </span>
                  {isActive && !isDone && (
                    <Loader2 size={12} className="animate-spin ml-auto" style={{ color: 'var(--color-text-400)' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

/* ─────────────── MiSolicitudTab ─────────────── */

const TODAY = new Date().toISOString().slice(0, 10)
const DEFAULT_CONTRATO = 'CW286091'

export function MiSolicitudTab() {
  const { user } = useAuthStore()
  const userFullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ')

  const now = new Date()
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())

  const { data: lista = [], isLoading: listaLoading } = useMisSolicitudes(mes, anio)
  const { data: lugares = [] } = useFieldLugares(user?.field_id ?? null)
  const crearAdicional = useCrearSolicitudAdicional()
  const [activeTab, setActiveTab] = useState<string | null>(null)

  useEffect(() => { setActiveTab(null) }, [mes, anio])

  const mainSolicitud = lista.find((s) => !s.field_lugar_id) ?? lista[0] ?? null
  const activeSolicitudId = activeTab === null
    ? (mainSolicitud?.id ?? null)
    : (lista.find((s) => s.field_lugar_id === activeTab)?.id ?? null)
  const { data: solicitud, isLoading: solLoading } = useSolicitud(activeSolicitudId)
  const isLoading  = listaLoading || (!!activeSolicitudId && solLoading && !solicitud)
  const isWaiting  = !isLoading && activeTab !== null && !activeSolicitudId

  const llenar = useLlenarMiSolicitud()
  const solicitudCerrada = solicitud?.estado === 'COMPLETADA' || solicitud?.estado === 'GENERADA'
  const { data: rqsSolicitud = [] } = useSolicitudRequisiciones(
    solicitudCerrada ? (solicitud?.id ?? null) : null
  )

  const [fecha,        setFecha]        = useState(TODAY)
  const [nombre,       setNombre]       = useState(userFullName)
  const [contrato,     setContrato]     = useState(DEFAULT_CONTRATO)
  const [cantidades,   setCantidades]   = useState<CantidadMap>({})
  const [catActiva,    setCatActiva]    = useState<CategoriaInsumo | null>(null)
  const [busqueda,     setBusqueda]     = useState('')
  const [previewRqId,   setPreviewRqId]   = useState<string | null>(null)
  const [recibiendoRqId, setRecibiendoRqId] = useState<string | null>(null)
  const ESTADOS_RECIBIBLES = new Set(['PEDIDO_REALIZADO', 'EN_BODEGA'])
  const [showConfirm,   setShowConfirm]   = useState(false)
  const [showFirmaStep, setShowFirmaStep] = useState(false)
  const [progressStep,  setProgressStep]  = useState<ProgressStep | null>(null)
  const [adicionalModal, setAdicionalModal] = useState<{ item: SolicitudItem | null } | null>(null)

  const eliminarAdicional = useEliminarAdicional(solicitud?.id ?? '')

  useEffect(() => {
    if (!solicitud) {
      setFecha(TODAY); setNombre(userFullName); setContrato(DEFAULT_CONTRATO)
      setCantidades({}); setCatActiva(null)
      return
    }
    const init: CantidadMap = {}
    for (const item of (solicitud.categorias ?? []).flatMap((c) => c.items)) {
      if (!item.es_adicional) {
        init[item.id] = item.solicitado != null ? String(Math.round(Number(item.solicitado))) : ''
      }
    }
    setCantidades(init)
    setFecha(solicitud.fecha || TODAY)
    setNombre(solicitud.nombre_solicitante || userFullName)
    setContrato(solicitud.numero_contrato || DEFAULT_CONTRATO)
    if (solicitud.categorias?.length) setCatActiva(solicitud.categorias[0].categoria)
  }, [solicitud, userFullName])

  useEffect(() => {
    if (progressStep !== 'done') return
    const t = setTimeout(() => setProgressStep(null), 900)
    return () => clearTimeout(t)
  }, [progressStep])

  function adjustPeriod(delta: number) {
    let m = mes + delta, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  function handleTabClick(lugarId: string | null) {
    if (lugarId === activeTab) return
    setCatActiva(null); setBusqueda(''); setAdicionalModal(null)
    setActiveTab(lugarId)
    if (lugarId !== null && !lista.find((s) => s.field_lugar_id === lugarId)) {
      crearAdicional.mutate({ mes, anio, field_lugar_id: lugarId })
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setShowConfirm(true)
  }

  function handleConfirm() {
    setShowConfirm(false)
    setShowFirmaStep(true)
  }

  async function handleConfirmarConFirma(firmaUrl: string, cargo: string) {
    if (!solicitud) return
    setShowFirmaStep(false)
    setProgressStep('sending')
    llenar.mutate(
      {
        id:                 solicitud.id,
        fecha,
        nombre_solicitante: nombre,
        numero_contrato:    contrato,
        items:              (solicitud.categorias ?? []).flatMap((c) => c.items)
          .filter((item) => !item.es_adicional)
          .map((item) => ({
            id:         item.id,
            solicitado: Number(cantidades[item.id] ?? 0),
          })),
      },
      {
        onSuccess: async () => {
          setProgressStep('generating')
          // Build current-state solicitud for PDF — don't use the cached object
          // which still holds pre-mutation values (old quantities, old fields)
          const pdfSolicitud = {
            ...solicitud,
            fecha,
            nombre_solicitante: nombre,
            numero_contrato:    contrato,
            categorias: (solicitud.categorias ?? []).map((catData) => ({
              ...catData,
              items: catData.items.map((item) => ({
                ...item,
                solicitado: item.es_adicional
                  ? item.solicitado
                  : Number(cantidades[item.id] ?? 0),
              })),
            })),
          }
          for (const { categoria } of pdfSolicitud.categorias) {
            try {
              await generarPdfsSolicitud({ solicitud: pdfSolicitud, categoria, mes, anio, firmaUrl, cargo, formatCOP })
            } catch {
              // continue with other categories
            }
          }
          setProgressStep('done')
        },
        onError: () => {
          setProgressStep(null)
        },
      },
    )
  }

  const periodLabel = `${MESES[mes - 1]} ${anio}`
  const categorias  = solicitud?.categorias ?? []

  function totalItem(item: SolicitudItem) {
    const cant = item.es_adicional
      ? Number(item.solicitado ?? 0)
      : Number(cantidades[item.id] ?? 0)
    if (!cant || item.valor_unitario === null || item.valor_unitario === undefined || item.valor_unitario === '') return null
    return cant * Number(item.valor_unitario)
  }

  function totalCategoria(cat: CategoriaInsumo) {
    const catData = categorias.find((c) => c.categoria === cat)
    return (catData?.items ?? []).reduce((sum, item) => {
      const t = totalItem(item)
      return t !== null ? sum + t : sum
    }, 0)
  }

  function totalGeneral() {
    return categorias.flatMap((c) => c.items).reduce((sum, item) => {
      const t = totalItem(item)
      return t !== null ? sum + t : sum
    }, 0)
  }

  const itemsActivos: SolicitudItem[] = catActiva
    ? [...(categorias.find((c) => c.categoria === catActiva)?.items ?? [])].sort((a, b) => {
        if (a.es_adicional && !b.es_adicional) return 1
        if (!a.es_adicional && b.es_adicional) return -1
        return a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' })
      })
    : []

  const itemsFiltrados = busqueda.trim()
    ? itemsActivos.filter((i) =>
        i.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.codigo.toLowerCase().includes(busqueda.toLowerCase())
      )
    : itemsActivos

  return (
    <div className="flex flex-col gap-4">
      {/* Period navigator */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
          Solicitud de insumos
        </h3>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-lg px-2 py-1.5"
            style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)' }}
          >
            <button
              type="button"
              onClick={() => adjustPeriod(-1)}
              className="w-6 h-6 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-400)' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span
              className="text-xs font-semibold px-2 whitespace-nowrap"
              style={{ color: 'var(--color-text-900)', minWidth: 100, textAlign: 'center' }}
            >
              {periodLabel}
            </span>
            <button
              type="button"
              onClick={() => adjustPeriod(1)}
              className="w-6 h-6 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-400)' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs: main + lugares configurados por el encargado */}
      {lista.length > 0 && lugares.length > 0 && (
        <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ background: 'var(--color-surface-2)' }}>
          {mainSolicitud && (
            <button
              type="button"
              onClick={() => handleTabClick(null)}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5"
              style={
                activeTab === null
                  ? { background: 'var(--color-surface-0)', color: 'var(--color-primary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                  : { color: 'var(--color-text-400)' }
              }
            >
              {mainSolicitud.lugar}
              {mainSolicitud.estado === 'COMPLETADA' && <CheckCircle2 size={10} style={{ color: '#16a34a' }} />}
            </button>
          )}
          {lugares.map((lugar) => {
            const sol      = lista.find((s) => s.field_lugar_id === lugar.id)
            const isActive  = activeTab === lugar.id
            const isCreating = crearAdicional.isPending && activeTab === lugar.id
            return (
              <button
                key={lugar.id}
                type="button"
                onClick={() => handleTabClick(lugar.id)}
                disabled={crearAdicional.isPending}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5"
                style={
                  isActive
                    ? { background: 'var(--color-surface-0)', color: 'var(--color-primary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                    : { color: 'var(--color-text-400)' }
                }
              >
                {lugar.nombre}
                {!isCreating && sol?.estado === 'COMPLETADA' && <CheckCircle2 size={10} style={{ color: '#16a34a' }} />}
                {isCreating && <Loader2 size={10} className="animate-spin" />}
              </button>
            )
          })}
        </div>
      )}

      {(isLoading || isWaiting) ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : lista.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <Clock size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin plantilla para {periodLabel}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
            El encargado aun no ha enviado la plantilla de insumos para este mes
          </p>
        </div>
      ) : !solicitud ? null : solicitudCerrada ? (
        <div className="flex flex-col gap-4">
          {/* Confirmacion */}
          <div
            className="flex items-center gap-4 px-5 py-4 rounded-xl"
            style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
          >
            <CheckCircle2 size={28} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                Solicitud de {periodLabel} enviada
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                {solicitud.lugar} - CC {solicitud.lote}
              </p>
            </div>
          </div>

          {/* Datos de la solicitud */}
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 py-4 rounded-xl"
            style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
          >
            {[
              { label: 'Fecha',       value: solicitud.fecha              ?? '-' },
              { label: 'Solicitante', value: solicitud.nombre_solicitante ?? '-' },
              { label: 'Contrato',    value: solicitud.numero_contrato    ?? '-' },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{label}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Trazabilidad de requisiciones */}
          {(() => {
            const RQ_INFO: Record<string, { color: string; desc: string }> = {
              APROBADA:         { color: '#3b82f6', desc: 'Solicitud procesada, pedido en preparacion' },
              PEDIDO_REALIZADO: { color: '#f59e0b', desc: 'Pedido realizado al proveedor' },
              EN_BODEGA:        { color: '#0891b2', desc: 'Insumos disponibles en bodega, ya puedes pasar a recoger' },
              ENTREGADO:        { color: '#16a34a', desc: 'Insumos recibidos' },
            }
            const RQ_LABELS: Record<string, string> = {
              APROBADA: 'Aprobada', PEDIDO_REALIZADO: 'Pedido realizado',
              EN_BODEGA: 'En bodega', ENTREGADO: 'Recibido',
              ABIERTA: 'Abierta', COMPLETADA: 'Completada',
            }
            return (
              <>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="px-5 py-3" style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-900)' }}>
                      Seguimiento de requisiciones
                    </p>
                  </div>
                  {rqsSolicitud.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Clock size={22} style={{ color: 'var(--color-text-400)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                        Pendiente de procesamiento
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                        El encargado esta revisando tu solicitud y generara las requisiciones
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {rqsSolicitud.map((rq) => {
                        const info  = RQ_INFO[rq.estado]
                        const color = info?.color ?? '#6b7280'
                        return (
                          <div key={rq.id} className="flex items-center gap-3 px-5 py-3 flex-wrap" style={{ background: 'var(--color-surface-0)' }}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold" style={{ color: 'var(--color-text-900)' }}>
                                  RQ #{rq.numero_rq}
                                </span>
                                <span
                                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
                                >
                                  {CATEGORIA_LABELS[rq.categoria]}
                                </span>
                                <span
                                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={{ background: `${color}22`, color }}
                                >
                                  {RQ_LABELS[rq.estado] ?? rq.estado}
                                </span>
                              </div>
                              {info && (
                                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                                  {info.desc}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {ESTADOS_RECIBIBLES.has(rq.estado) && (
                                <button
                                  onClick={() => setRecibiendoRqId(rq.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                                >
                                  <Package size={12} />
                                  Recibir insumos
                                </button>
                              )}
                              <button
                                onClick={() => setPreviewRqId(rq.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity shrink-0"
                                title="Ver lo solicitado"
                                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
                              >
                                <Eye size={13} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                {previewRqId    && <RQPreviewModal  rqId={previewRqId}    onClose={() => setPreviewRqId(null)} />}
                {recibiendoRqId && <RecepcionModal   rqId={recibiendoRqId} onClose={() => setRecibiendoRqId(null)} />}
              </>
            )
          })()}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Info + datos + boton */}
          <div
            className="rounded-xl px-5 py-4 flex flex-col gap-4"
            style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>
                  {solicitud.lugar} - CC {solicitud.lote}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>Plantilla de {periodLabel}</p>
              </div>
              <button
                type="submit"
                disabled={llenar.isPending || !fecha || !nombre || !contrato}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-opacity shrink-0"
                style={{
                  background: 'var(--color-primary)',
                  color: '#fff',
                  opacity: (llenar.isPending || !fecha || !nombre || !contrato) ? 0.6 : 1,
                }}
              >
                <Send size={15} />
                Revisar y enviar
              </button>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-400)' }}>
              Datos del solicitante
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Fecha</label>
                <input
                  required type="date" value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="rounded-lg text-sm outline-none px-3 py-2"
                  style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Nombre del solicitante</label>
                <input
                  required value={nombre} placeholder="Nombre completo"
                  onChange={(e) => setNombre(e.target.value)}
                  className="rounded-lg text-sm outline-none px-3 py-2"
                  style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Numero de contrato</label>
                <input
                  required value={contrato} placeholder="CT-2026-001"
                  onChange={(e) => setContrato(e.target.value)}
                  className="rounded-lg text-sm outline-none px-3 py-2"
                  style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                />
              </div>
            </div>
          </div>

          {/* Selector de categorias + tabla */}
          {categorias.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-10 rounded-xl"
              style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-400)' }}>
                La plantilla no tiene insumos configurados
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Tabs */}
              <div
                className="flex gap-1 p-1 rounded-xl w-fit"
                style={{ background: 'var(--color-surface-2)' }}
              >
                {categorias.map(({ categoria }) => (
                  <button
                    key={categoria}
                    type="button"
                    onClick={() => { setCatActiva(categoria); setBusqueda('') }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                    style={
                      catActiva === categoria
                        ? { background: 'var(--color-surface-0)', color: 'var(--color-primary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                        : { color: 'var(--color-text-400)' }
                    }
                  >
                    {CATEGORIA_LABELS[categoria]}
                    <span
                      className="ml-1.5 text-xs rounded-full px-1.5 py-0.5"
                      style={{
                        background: catActiva === categoria ? 'var(--color-primary)' : 'var(--color-surface-1)',
                        color: catActiva === categoria ? '#fff' : 'var(--color-text-400)',
                        fontSize: '10px',
                      }}
                    >
                      {categorias.find((c) => c.categoria === categoria)?.items.length ?? 0}
                    </span>
                  </button>
                ))}
              </div>

              {/* Buscador + boton agregar adicional */}
              <div className="flex gap-2">
                <div
                  className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)' }}
                >
                  <Search size={14} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por codigo o descripcion..."
                    className="flex-1 text-xs outline-none bg-transparent"
                    style={{ color: 'var(--color-text-900)' }}
                  />
                  {busqueda && (
                    <button
                      type="button"
                      onClick={() => setBusqueda('')}
                      className="text-xs hover:opacity-70"
                      style={{ color: 'var(--color-text-400)' }}
                    >
                      x
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAdicionalModal({ item: null })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap hover:opacity-80 transition-opacity"
                  style={{ background: '#fef3c7', color: '#92400e', border: '1.5px solid #fcd34d' }}
                >
                  <Plus size={13} />
                  Adicional
                </button>
              </div>

              {/* Tabla */}
              {itemsFiltrados.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-10 rounded-xl"
                  style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-400)' }}>
                    {busqueda ? 'Sin resultados para la busqueda' : 'Esta categoria no tiene insumos'}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                          {['Codigo', 'Descripcion', 'Unidad', 'V. Unitario', 'Solicitado', 'Total', ''].map((h) => (
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
                        {itemsFiltrados.map((item, idx) => {
                          const t          = totalItem(item)
                          const isAdicional = !!item.es_adicional
                          return (
                            <tr
                              key={item.id}
                              style={{
                                borderBottom: '1px solid var(--color-border)',
                                background: isAdicional
                                  ? 'rgba(217,119,6,0.06)'
                                  : (idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)'),
                              }}
                            >
                              {/* Codigo */}
                              <td
                                className="px-3 py-2.5 font-mono text-xs font-semibold"
                                style={{ color: 'var(--color-text-600)', borderLeft: isAdicional ? '3px solid #d97706' : undefined }}
                              >
                                {item.codigo}
                                {isAdicional && (
                                  <span
                                    className="ml-1.5 rounded px-1 py-0.5"
                                    style={{ background: '#fef3c7', color: '#92400e', fontSize: '9px', fontFamily: 'inherit', fontWeight: 700 }}
                                  >
                                    ADC
                                  </span>
                                )}
                              </td>

                              {/* Descripcion + proveedor si es adicional */}
                              <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--color-text-900)', minWidth: 200 }}>
                                {item.descripcion}
                                {isAdicional && item.proveedor && (
                                  <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                                    {item.proveedor}
                                  </span>
                                )}
                              </td>

                              <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-600)' }}>
                                {item.unidad}
                              </td>

                              <td className="px-3 py-2.5 text-xs font-semibold text-right whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                                {formatCOP(item.valor_unitario)}
                              </td>

                              {/* Solicitado: input para plantilla, texto para adicional */}
                              <td className="px-3 py-2.5" style={{ minWidth: 96 }}>
                                {isAdicional ? (
                                  <span className="text-xs font-semibold block text-right px-2" style={{ color: 'var(--color-text-900)' }}>
                                    {item.solicitado ?? '-'}
                                  </span>
                                ) : (
                                  <input
                                    type="number" min="0" step="1"
                                    value={cantidades[item.id] ?? ''}
                                    onChange={(e) => setCantidades((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                    placeholder="0"
                                    className="rounded-lg text-xs outline-none text-right w-full"
                                    style={{
                                      border: '1.5px solid var(--color-border)',
                                      background: 'var(--color-surface-0)',
                                      color: 'var(--color-text-900)',
                                      padding: '5px 8px',
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                                    onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                                  />
                                )}
                              </td>

                              <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap" style={{ color: t !== null ? (isAdicional ? '#d97706' : 'var(--color-text-900)') : 'var(--color-text-400)' }}>
                                {formatCOP(t)}
                              </td>

                              {/* Acciones para adicionales */}
                              <td className="px-3 py-2.5">
                                {isAdicional && (
                                  <div className="flex gap-1 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setAdicionalModal({ item })}
                                      className="w-6 h-6 rounded flex items-center justify-center hover:opacity-70"
                                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
                                    >
                                      <Pencil size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => eliminarAdicional.mutate(item.id)}
                                      className="w-6 h-6 rounded flex items-center justify-center hover:opacity-70"
                                      style={{ background: '#fef2f2', color: '#ef4444' }}
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      {catActiva && (
                        <tfoot>
                          <tr style={{ background: 'var(--color-surface-1)', borderTop: '2px solid var(--color-border)' }}>
                            <td colSpan={6} className="px-3 py-2.5 text-xs font-bold text-right" style={{ color: 'var(--color-text-600)' }}>
                              Subtotal {CATEGORIA_LABELS[catActiva]}
                            </td>
                            <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>
                              {formatCOP(totalCategoria(catActiva))}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {/* Total general */}
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
              >
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-600)' }}>
                  Total general
                </span>
                <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                  {formatCOP(totalGeneral())}
                </span>
              </div>
            </div>
          )}

          {/* Modal de confirmacion */}
          {showConfirm && (
            <ModalPortal onClose={() => !llenar.isPending && setShowConfirm(false)}>
              <div
                className="w-full max-w-sm rounded-2xl flex flex-col gap-0 overflow-hidden"
                style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.25)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="px-6 py-5"
                  style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-secondary)' }}>
                    Confirmar solicitud
                  </p>
                  <h2 className="text-base font-bold" style={{ color: 'var(--color-text-900)' }}>
                    {solicitud.lugar}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                    CC {solicitud.lote} &middot; {nombre}
                  </p>
                </div>

                <div className="px-6 py-5 flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-400)' }}>
                    Resumen por categoria
                  </p>
                  {(solicitud.categorias ?? []).map(({ categoria: cat }) => {
                    const sub = totalCategoria(cat)
                    return (
                      <div key={cat} className="flex items-center justify-between gap-4">
                        <span className="text-sm" style={{ color: 'var(--color-text-600)' }}>
                          {CATEGORIA_LABELS[cat]}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                          {sub > 0 ? formatCOP(sub) : <span style={{ color: 'var(--color-text-400)' }}>Sin solicitar</span>}
                        </span>
                      </div>
                    )
                  })}
                  <div
                    className="flex items-center justify-between gap-4 pt-4 mt-1"
                    style={{ borderTop: '1.5px solid var(--color-border)' }}
                  >
                    <span className="text-sm font-bold" style={{ color: 'var(--color-text-900)' }}>Total general</span>
                    <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                      {formatCOP(totalGeneral())}
                    </span>
                  </div>
                </div>

                <div
                  className="px-6 py-4 flex gap-3"
                  style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
                >
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    disabled={llenar.isPending}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity"
                    style={{
                      background: 'var(--color-surface-0)',
                      border: '1.5px solid var(--color-border)',
                      color: 'var(--color-text-600)',
                      opacity: llenar.isPending ? 0.5 : 1,
                    }}
                  >
                    Corregir
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={llenar.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-opacity"
                    style={{
                      background: 'var(--color-primary)',
                      color: '#fff',
                      opacity: llenar.isPending ? 0.6 : 1,
                    }}
                  >
                    {llenar.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {llenar.isPending ? 'Enviando...' : 'Confirmar envio'}
                  </button>
                </div>
              </div>
            </ModalPortal>
          )}

          {/* Modal de firma */}
          {showFirmaStep && user?.id && (
            <FirmaStepModal
              userId={user.id}
              userPosition={user.position ?? ''}
              onConfirm={handleConfirmarConFirma}
              onCancel={() => { setShowFirmaStep(false); setShowConfirm(true) }}
            />
          )}

          {/* Modal de progreso de envio */}
          {progressStep && <ProgressModal step={progressStep} />}

          {/* Modal de adicional (crear/editar) */}
          {adicionalModal !== null && catActiva && (
            <AdicionalModal
              solicitudId={solicitud.id}
              catDefault={catActiva}
              item={adicionalModal.item}
              onClose={() => setAdicionalModal(null)}
            />
          )}
        </form>
      )}

    </div>
  )
}
