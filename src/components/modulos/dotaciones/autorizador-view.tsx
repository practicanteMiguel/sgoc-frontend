'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FileText, Eye, CheckCircle2, XCircle, Lock, Loader2,
  User, Calendar, Building2, X, ChevronDown, ChevronUp, Image as ImageIcon, PenLine, FileDown, FileSpreadsheet,
} from 'lucide-react'
import { useAllDotacionSolicitudes, useAutorizarDotacion, useFirmarAutorizador } from '@/src/hooks/dotaciones/use-dotaciones'
import { exportDotacionPdf, exportDotacionExcel } from '@/src/lib/dotacion-export'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { ESTADO_DOTACION_LABELS, ESTADO_DOTACION_COLORS } from '@/src/types/dotaciones.types'
import type { DotacionSolicitud, Reposicion, EstadoDotacion } from '@/src/types/dotaciones.types'

const CSS_VARS: React.CSSProperties = {
  '--color-surface-0':  '#ffffff',
  '--color-surface-1':  '#f8fafc',
  '--color-surface-2':  '#f1f5f9',
  '--color-surface-3':  '#e4eaf2',
  '--color-border':     '#d1d5db',
  '--color-text-900':   '#111827',
  '--color-text-700':   '#374151',
  '--color-text-600':   '#4b5563',
  '--color-text-400':   '#9ca3af',
  '--color-primary':    '#1a6b6b',
  '--color-secundary':  '#1a3a3a',
  '--color-danger':     '#dc2626',
} as React.CSSProperties

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ESTADO_ORDER: EstadoDotacion[] = ['emitida', 'autorizada', 'generada', 'entregada']

// ── Reposicion expand row ─────────────────────────────────────────────────
function ReposicionDetailRow({ rep, index }: { rep: Reposicion; index: number }) {
  const [open, setOpen] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  return (
    <>
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          style={{ background: 'var(--color-surface-1)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
              style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-600)' }}
            >
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                {rep.empleado.first_name} {rep.empleado.last_name}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{rep.empleado.position}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {rep.imagenes.length > 0 && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-400)' }}>
                <ImageIcon size={12} />
                {rep.imagenes.length}
              </span>
            )}
            {open ? <ChevronUp size={14} style={{ color: 'var(--color-text-400)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-400)' }} />}
          </div>
        </button>

        {open && (
          <div className="px-4 py-3 flex flex-col gap-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-400)' }}>Condicion encontrada</p>
              <p className="text-sm" style={{ color: 'var(--color-text-700)' }}>{rep.condicion_encontrada}</p>
            </div>
            {rep.fecha_entrega && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-400)' }}>Fecha de entrega</p>
                <p className="text-sm" style={{ color: 'var(--color-text-700)' }}>{formatDate(rep.fecha_entrega)}</p>
              </div>
            )}
            {rep.imagenes.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-400)' }}>Fotos</p>
                <div className="flex flex-wrap gap-2">
                  {rep.imagenes.map(img => (
                    <button
                      key={img.id}
                      onClick={() => setLightbox(img.url)}
                      className="rounded-lg overflow-hidden"
                      style={{ width: 72, height: 72, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                    >
                      <img src={img.url} alt={img.original_name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-1000 flex items-center justify-center p-4"
          style={{ background: 'rgba(4,24,24,0.85)', backdropFilter: 'blur(4px)' }}
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            onClick={() => setLightbox(null)}
          >
            <X size={18} color="#fff" />
          </button>
          <img
            src={lightbox}
            alt="foto"
            className="max-w-full max-h-full rounded-xl"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

// ── Detail modal ──────────────────────────────────────────────────────────
const INPUT_STYLE: React.CSSProperties = {
  background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none', color: '#111827',
}

function SolicitudDetailModal({
  solicitud,
  onClose,
}: {
  solicitud: DotacionSolicitud
  onClose: () => void
}) {
  const [step, setStep]     = useState<'view' | 'sign'>('view')
  const [nombre, setNombre] = useState('Carlos Murcia')
  const [cargo, setCargo]   = useState('Lider Financiero')
  const [hasStrokes, setHasStrokes] = useState(false)
  const [loadingPdf, setLoadingPdf]   = useState(false)
  const [loadingXlsx, setLoadingXlsx] = useState(false)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const drawing    = useRef(false)
  const firmar     = useFirmarAutorizador()
  const autorizar  = useAutorizarDotacion()
  const submitting = firmar.isPending || autorizar.isPending

  useEffect(() => {
    if (step !== 'sign') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setHasStrokes(false)
  }, [step])

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy }
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
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

  function handleConfirmarFirma() {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes || !nombre.trim() || !cargo.trim()) return
    canvas.toBlob(blob => {
      if (!blob) return
      firmar.mutate(
        { id: solicitud.id, firmaBlob: blob, nombre: nombre.trim(), cargo: cargo.trim() },
        {
          onSuccess: () => {
            autorizar.mutate(
              { id: solicitud.id, estado: 'autorizada' },
              { onSuccess: onClose },
            )
          },
        },
      )
    }, 'image/png')
  }

  const canConfirm = hasStrokes && nombre.trim() !== '' && cargo.trim() !== ''

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl flex flex-col overflow-hidden"
        style={{ background: '#ffffff', border: '1px solid #d1d5db', boxShadow: '0 24px 64px rgba(4,24,24,0.25)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: ESTADO_DOTACION_COLORS[solicitud.estado] + '22', color: ESTADO_DOTACION_COLORS[solicitud.estado] }}
              >
                {ESTADO_DOTACION_LABELS[solicitud.estado]}
              </span>
              {step === 'sign' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  Firma del autorizador
                </span>
              )}
            </div>
            <p className="text-base font-semibold" style={{ color: '#111827' }}>
              {solicitud.campo?.name ?? 'Campo'} &mdash; {formatDate(solicitud.fecha)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
              {solicitud.inspeccion_realizada_por} &middot; {solicitud.cargo_inspector} &middot; Contrato {solicitud.contrato}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#9ca3af' }}>
            <X size={18} />
          </button>
        </div>

        {step === 'view' ? (
          <>
            {/* Stats bar */}
            <div className="px-5 py-3 flex gap-6 shrink-0" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <div className="flex items-center gap-1.5">
                <User size={13} style={{ color: '#9ca3af' }} />
                <span className="text-xs" style={{ color: '#4b5563' }}>
                  <strong>{solicitud.reposiciones.length}</strong> reposicion{solicitud.reposiciones.length !== 1 ? 'es' : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} style={{ color: '#9ca3af' }} />
                <span className="text-xs" style={{ color: '#4b5563' }}>
                  Emitida el <strong>{formatDate(solicitud.created_at)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ImageIcon size={13} style={{ color: '#9ca3af' }} />
                <span className="text-xs" style={{ color: '#4b5563' }}>
                  <strong>{solicitud.reposiciones.reduce((n, r) => n + r.imagenes.length, 0)}</strong> fotos
                </span>
              </div>
            </div>

            {/* Reposiciones */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
              {solicitud.reposiciones.map((rep, i) => (
                <ReposicionDetailRow key={rep.id} rep={rep} index={i} />
              ))}
              {solicitud.reposiciones.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: '#9ca3af' }}>Sin reposiciones</p>
              )}
            </div>

            {/* Export */}
            <div className="px-5 py-3 flex gap-2 shrink-0" style={{ borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <button
                onClick={async () => { setLoadingPdf(true); try { await exportDotacionPdf(solicitud) } finally { setLoadingPdf(false) } }}
                disabled={loadingPdf || loadingXlsx}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                style={{ background: '#f1f5f9', border: '1px solid #d1d5db', color: '#374151' }}
              >
                {loadingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                PDF
              </button>
              <button
                onClick={async () => { setLoadingXlsx(true); try { await exportDotacionExcel(solicitud) } finally { setLoadingXlsx(false) } }}
                disabled={loadingPdf || loadingXlsx}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                style={{ background: '#f1f5f9', border: '1px solid #d1d5db', color: '#374151' }}
              >
                {loadingXlsx ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
                Excel
              </button>
            </div>

            {/* Actions */}
            {solicitud.estado === 'emitida' && (
              <div className="px-5 py-4 flex gap-3 shrink-0" style={{ borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: '#fff', border: '1.5px solid #d1d5db', color: '#374151' }}
                >
                  Cerrar
                </button>
                <button
                  onClick={() => setStep('sign')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: '#1a3a3a', color: '#fff' }}
                >
                  <PenLine size={15} />
                  Firmar y autorizar
                </button>
              </div>
            )}
          </>
        ) : (
          /* ── Signing step ── */
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: '#6b7280' }}>Nombre del autorizador *</label>
                <input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Maria Lopez"
                  style={INPUT_STYLE}
                  onFocus={e => { e.target.style.borderColor = '#1a3a3a' }}
                  onBlur={e =>  { e.target.style.borderColor = '#d1d5db' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: '#6b7280' }}>Cargo *</label>
                <input
                  value={cargo}
                  onChange={e => setCargo(e.target.value)}
                  placeholder="Ej: Coordinador HSE"
                  style={INPUT_STYLE}
                  onFocus={e => { e.target.style.borderColor = '#1a3a3a' }}
                  onBlur={e =>  { e.target.style.borderColor = '#d1d5db' }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: '#6b7280' }}>Firma *</label>
              <div style={{ border: '1.5px solid #d1d5db', borderRadius: 8, overflow: 'hidden', background: '#fff', touchAction: 'none' }}>
                <canvas
                  ref={canvasRef}
                  width={600}
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

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setStep('view')}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#f8fafc', border: '1.5px solid #d1d5db', color: '#374151', opacity: submitting ? 0.5 : 1 }}
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleLimpiar}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#f8fafc', border: '1.5px solid #d1d5db', color: '#374151', opacity: submitting ? 0.5 : 1 }}
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={handleConfirmarFirma}
                disabled={!canConfirm || submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-opacity"
                style={{ background: '#1a3a3a', color: '#fff', opacity: (!canConfirm || submitting) ? 0.5 : 1 }}
              >
                {submitting
                  ? <Loader2 size={15} className="animate-spin" />
                  : <CheckCircle2 size={15} />
                }
                {submitting ? 'Procesando...' : 'Confirmar firma y autorizar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  )
}

// ── Solicitudes list tab ──────────────────────────────────────────────────
function SolicitudesTab({ estado }: { estado?: EstadoDotacion }) {
  const { data: solicitudes, isLoading, isError } = useAllDotacionSolicitudes(estado ? { estado } : undefined)
  const [selected, setSelected] = useState<DotacionSolicitud | null>(null)

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
    </div>
  )

  if (isError) return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <XCircle size={24} style={{ color: 'var(--color-danger)' }} />
      <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>Error al cargar solicitudes</p>
    </div>
  )

  if (!solicitudes || solicitudes.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ background: 'var(--color-surface-1)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
      <FileText size={24} style={{ color: 'var(--color-text-400)' }} />
      <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>No hay solicitudes en este estado</p>
    </div>
  )

  return (
    <>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-secundary)', color: '#fff' }}>
              {['Campo', 'Inspector', 'Fecha', 'Reposiciones', 'Contrato', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((sol, idx) => (
              <tr
                key={sol.id}
                style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}
              >
                <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>
                  <div className="flex items-center gap-2">
                    <Building2 size={13} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                    {sol.campo?.name ?? '-'}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-text-700)' }}>
                  <div>{sol.inspeccion_realizada_por}</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-400)' }}>{sol.cargo_inspector}</div>
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                  {formatDate(sol.fecha)}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap" style={{ color: 'var(--color-text-700)' }}>
                  {sol.reposiciones.length}
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                  {sol.contrato}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: ESTADO_DOTACION_COLORS[sol.estado] + '22', color: ESTADO_DOTACION_COLORS[sol.estado] }}
                  >
                    {ESTADO_DOTACION_LABELS[sol.estado]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelected(sol)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
                  >
                    <Eye size={13} />
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <SolicitudDetailModal
          solicitud={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

// ── Main autorizador view ─────────────────────────────────────────────────
interface Props {
  valid: boolean
}

type Tab = EstadoDotacion | 'todas'

const TABS: { id: Tab; label: string }[] = [
  { id: 'emitida',    label: 'Emitidas'    },
  { id: 'autorizada', label: 'Autorizadas' },
  { id: 'generada',   label: 'Generadas'   },
  { id: 'entregada',  label: 'Entregadas'  },
  { id: 'todas',      label: 'Todas'       },
]

export function AutrizadorDotacionesView({ valid }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('emitida')

  if (!valid) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f0f4f4] px-6 text-center" style={CSS_VARS}>
      <Lock size={36} style={{ color: '#9ca3af' }} />
      <p className="text-lg font-semibold" style={{ color: 'var(--color-secundary)' }}>Acceso restringido</p>
      <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>Esta pagina requiere un enlace autorizado.</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface-1)', ...CSS_VARS }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8 animate-fade-in">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--color-secundary)' }}>
            Dotaciones - Autorizador
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-400)' }}>
            Revisa y autoriza las solicitudes de reposicion de dotacion emitidas por el HSE
          </p>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 mb-5 p-1 rounded-xl w-fit flex-wrap"
          style={{ background: 'var(--color-surface-2)' }}
        >
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={
                activeTab === t.id
                  ? { background: 'var(--color-surface-0)', color: 'var(--color-secundary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                  : { color: 'var(--color-text-400)' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="animate-fade-in">
          <SolicitudesTab estado={activeTab === 'todas' ? undefined : activeTab} />
        </div>
      </div>
    </div>
  )
}
