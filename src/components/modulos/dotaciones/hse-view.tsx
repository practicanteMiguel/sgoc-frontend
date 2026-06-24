'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { formatDateShort as formatDate } from '@/src/lib/utils'
import { Loader2, XCircle, CheckCircle2, Plus, Trash2, Upload, X, Send, ChevronDown, Image as ImageIcon, PenLine } from 'lucide-react'
import { ESTADO_DOTACION_LABELS, ESTADO_DOTACION_COLORS } from '@/src/types/dotaciones.types'
import type { DotacionSpaceInfo, DotacionSolicitud, CreateReposicionDto } from '@/src/types/dotaciones.types'
import { useFirmarHSE } from '@/src/hooks/dotaciones/use-dotaciones'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

const FIELD_STYLE: React.CSSProperties = {
  background:   '#fff',
  border:       '1.5px solid #d1d5db',
  borderRadius: '8px',
  padding:      '10px 14px',
  fontSize:     '13px',
  width:        '100%',
  outline:      'none',
  color:        '#111827',
}


interface EmpleadoOption {
  id: string
  first_name: string
  last_name: string
  position: string
  identification_number?: string
}

interface ReposicionForm {
  empleado_id: string
  empleado_nombre: string
  condicion_encontrada: string
  fecha_entrega: string
  imagenes: File[]
}

function emptyReposicion(): ReposicionForm {
  return { empleado_id: '', empleado_nombre: '', condicion_encontrada: '', fecha_entrega: '', imagenes: [] }
}

// ── Empleado search dropdown ───────────────────────────────────────────────
function EmpleadoSelect({
  value,
  token,
  onChange,
}: {
  value: { id: string; nombre: string }
  token: string
  onChange: (id: string, nombre: string) => void
}) {
  const [query, setQuery] = useState(value.nombre)
  const [open, setOpen] = useState(false)
  const [empleados, setEmpleados] = useState<EmpleadoOption[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`${API_BASE}/dotaciones/spaces/${token}/empleados`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setEmpleados(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = empleados.filter(e =>
    `${e.first_name} ${e.last_name} ${e.position}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center gap-2 rounded-lg"
        style={{ ...FIELD_STYLE, padding: '0', border: '1.5px solid #d1d5db', overflow: 'hidden' }}
      >
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar empleado..."
          style={{ ...FIELD_STYLE, border: 'none', flex: 1 }}
        />
        <span className="pr-3">
          {loading
            ? <Loader2 size={13} className="animate-spin" style={{ color: '#9ca3af' }} />
            : <ChevronDown size={13} style={{ color: '#9ca3af' }} />
          }
        </span>
      </div>

      {open && filtered.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
          style={{ background: '#fff', border: '1.5px solid #d1d5db', maxHeight: 200, overflowY: 'auto' }}
        >
          {filtered.map(emp => (
            <button
              key={emp.id}
              type="button"
              className="w-full text-left px-4 py-2.5 transition-colors"
              style={{ borderBottom: '1px solid #f3f4f6' }}
              onMouseDown={() => {
                const nombre = `${emp.first_name} ${emp.last_name}`
                onChange(emp.id, nombre)
                setQuery(nombre)
                setOpen(false)
              }}
            >
              <p className="text-sm font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
              <p className="text-xs text-gray-400">{emp.position}</p>
            </button>
          ))}
        </div>
      )}

      {open && !loading && query.length > 1 && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 px-4 py-3 rounded-xl shadow-lg" style={{ background: '#fff', border: '1.5px solid #d1d5db' }}>
          <p className="text-sm text-gray-400">Sin resultados</p>
        </div>
      )}
    </div>
  )
}

// ── Reposicion form row ────────────────────────────────────────────────────
function ReposicionFormRow({
  repo,
  index,
  token,
  onChange,
  onRemove,
}: {
  repo: ReposicionForm
  index: number
  token: string
  onChange: (updated: ReposicionForm) => void
  onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | null) {
    if (!files) return
    onChange({ ...repo, imagenes: [...repo.imagenes, ...Array.from(files)] })
  }

  function removeImg(i: number) {
    onChange({ ...repo, imagenes: repo.imagenes.filter((_, idx) => idx !== i) })
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1.5px solid #d1dede', background: '#fff' }}
    >
      {/* Row header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: '#f0f7f7', borderBottom: '1px solid #e5e7eb' }}
      >
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1a6b6b' }}>
          Reposicion {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded transition-opacity hover:opacity-70"
          style={{ color: '#9ca3af' }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Empleado */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">Empleado *</label>
          <EmpleadoSelect
            token={token}
            value={{ id: repo.empleado_id, nombre: repo.empleado_nombre }}
            onChange={(id, nombre) => onChange({ ...repo, empleado_id: id, empleado_nombre: nombre })}
          />
        </div>

        {/* Condicion */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">Condicion encontrada *</label>
          <textarea
            value={repo.condicion_encontrada}
            onChange={e => onChange({ ...repo, condicion_encontrada: e.target.value })}
            placeholder="Describa la condicion del EPP / dotacion..."
            rows={2}
            style={{ ...FIELD_STYLE, resize: 'none' }}
            onFocus={e => { e.target.style.borderColor = '#1a6b6b' }}
            onBlur={e => { e.target.style.borderColor = '#d1d5db' }}
          />
        </div>

        {/* Fecha entrega */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">Fecha en que fue entregado</label>
          <input
            type="date"
            value={repo.fecha_entrega}
            onChange={e => onChange({ ...repo, fecha_entrega: e.target.value })}
            style={FIELD_STYLE}
            onFocus={e => { e.target.style.borderColor = '#1a6b6b' }}
            onBlur={e => { e.target.style.borderColor = '#d1d5db' }}
          />
        </div>

        {/* Imagenes */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">Fotos de evidencia</label>

          {repo.imagenes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {repo.imagenes.map((file, i) => (
                <div
                  key={i}
                  className="relative rounded-lg overflow-hidden"
                  style={{ width: 64, height: 64, background: '#f0f4f4', border: '1px solid #d1dede' }}
                >
                  <Image
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => removeImg(i)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                  >
                    <X size={9} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-70 w-fit"
            style={{ background: '#f0f7f7', border: '1.5px solid #b3d4d4', color: '#1a6b6b' }}
          >
            <Upload size={13} />
            Agregar fotos
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => addFiles(e.target.files)}
          />
        </div>
      </div>
    </div>
  )
}

// ── Firma pad HSE ─────────────────────────────────────────────────────────
function FirmaPadHse({ onFirmado }: { onFirmado: (blob: Blob) => void }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const drawing    = useRef(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
  }, [])

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const sx = canvas.width  / rect.width
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

  function handleConfirmar() {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes) return
    canvas.toBlob(blob => { if (blob) onFirmado(blob) }, 'image/png')
  }

  return (
    <div className="rounded-2xl bg-white border border-[#d1dede] p-5 shadow-sm flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1a6b6b] mb-1">Firma del HSE</p>
        <p className="text-sm text-gray-500">Dibuje su firma para completar el registro de la solicitud.</p>
      </div>

      <div style={{ border: '1.5px solid #d1dede', borderRadius: 8, overflow: 'hidden', background: '#fff', touchAction: 'none' }}>
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleLimpiar}
          className="px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: '#f0f4f4', border: '1.5px solid #d1dede', color: '#374151' }}
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={handleConfirmar}
          disabled={!hasStrokes}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-opacity"
          style={{ background: '#1a6b6b', color: '#fff', opacity: !hasStrokes ? 0.5 : 1 }}
        >
          <PenLine size={16} />
          Confirmar firma
        </button>
      </div>
    </div>
  )
}

// ── Solicitud history card ─────────────────────────────────────────────────
function SolicitudCard({ sol }: { sol: DotacionSolicitud }) {
  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
      style={{ background: '#fff', border: '1px solid #d1dede' }}
    >
      <div>
        <p className="text-sm font-medium text-gray-900">
          {sol.inspeccion_realizada_por}
          <span className="ml-2 text-xs font-normal text-gray-400">{sol.cargo_inspector}</span>
        </p>
        <p className="text-xs text-gray-400">
          {formatDate(sol.fecha)} &middot; {sol.reposiciones.length} reposicion{sol.reposiciones.length !== 1 ? 'es' : ''} &middot; {sol.contrato}
        </p>
      </div>
      <span
        className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
        style={{ background: ESTADO_DOTACION_COLORS[sol.estado] + '22', color: ESTADO_DOTACION_COLORS[sol.estado] }}
      >
        {ESTADO_DOTACION_LABELS[sol.estado]}
      </span>
    </div>
  )
}

// ── Main HSE view ──────────────────────────────────────────────────────────
interface Props {
  token: string
}

export function HseView({ token }: Props) {
  const [spaceInfo, setSpaceInfo]     = useState<DotacionSpaceInfo | null>(null)
  const [solicitudes, setSolicitudes] = useState<DotacionSolicitud[]>([])
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [solicitudId, setSolicitudId] = useState<string | null>(null)
  const firmarHSE                     = useFirmarHSE()

  // Form fields
  const [contrato, setContrato]         = useState('CW286091')
  const [fecha, setFecha]               = useState(new Date().toISOString().split('T')[0])
  const [inspector, setInspector]       = useState('')
  const [cargoInspector, setCargoInspector] = useState('HSE')
  const [reposiciones, setReposiciones] = useState<ReposicionForm[]>([emptyReposicion()])

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/dotaciones/spaces/${token}`).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/dotaciones/spaces/${token}/solicitudes`).then(r => r.ok ? r.json() : []),
    ])
      .then(([info, sols]) => {
        if (!info) { setNotFound(true); return }
        setSpaceInfo(info)
        setSolicitudes(Array.isArray(sols) ? sols : [])
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  function updateRepo(index: number, updated: ReposicionForm) {
    setReposiciones(prev => prev.map((r, i) => i === index ? updated : r))
  }

  function removeRepo(index: number) {
    setReposiciones(prev => prev.filter((_, i) => i !== index))
  }

  function addRepo() {
    setReposiciones(prev => [...prev, emptyReposicion()])
  }

  const isValid =
    contrato.trim() &&
    fecha &&
    inspector.trim() &&
    cargoInspector.trim() &&
    reposiciones.length > 0 &&
    reposiciones.every(r => r.empleado_id && r.condicion_encontrada.trim())

  async function handleConfirm() {
    if (!isValid || !spaceInfo) return
    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('contrato', contrato)
      formData.append('fecha', fecha)
      formData.append('inspeccion_realizada_por', inspector)
      formData.append('cargo_inspector', cargoInspector)

      const reposicionesDto: CreateReposicionDto[] = reposiciones.map(r => ({
        empleado_id:          r.empleado_id,
        condicion_encontrada: r.condicion_encontrada,
        ...(r.fecha_entrega ? { fecha_entrega: r.fecha_entrega } : {}),
      }))
      formData.append('reposiciones', JSON.stringify(reposicionesDto))

      reposiciones.forEach((repo, i) => {
        repo.imagenes.forEach(file => {
          formData.append(`imagenes_${i}`, file)
        })
      })

      const res = await fetch(`${API_BASE}/dotaciones/spaces/${token}/solicitudes`, {
        method: 'POST',
        body:   formData,
      })

      if (res.ok) {
        const data = await res.json()
        setShowConfirm(false)
        setSolicitudId(data.id ?? null)
        if (!data.id) setSubmitted(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f4]">
      <Loader2 size={28} className="animate-spin text-[#1a6b6b]" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f0f4f4] px-6 text-center">
      <XCircle size={40} className="text-red-400" />
      <p className="text-lg font-semibold text-[#1a3a3a]">Enlace no valido</p>
      <p className="text-sm text-gray-500">Este espacio no existe o el enlace ha expirado.</p>
    </div>
  )

  if (solicitudId && !submitted) return (
    <div className="min-h-screen bg-[#f0f4f4] py-8 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div className="rounded-2xl bg-white border border-[#d1dede] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1a6b6b] mb-1">Solicitud registrada</p>
          <h1 className="text-xl font-bold text-[#1a3a3a]">{spaceInfo?.campo}</h1>
          <p className="text-sm text-gray-400 mt-1">Ahora firme para completar el proceso.</p>
        </div>
        <FirmaPadHse
          onFirmado={blob => {
            firmarHSE.mutate(
              { id: solicitudId, firmaBlob: blob },
              { onSuccess: () => setSubmitted(true), onError: () => setSubmitted(true) },
            )
          }}
        />
        {firmarHSE.isPending && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 size={18} className="animate-spin text-[#1a6b6b]" />
            <span className="text-sm text-gray-500">Guardando firma...</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          className="text-xs text-gray-400 underline text-center"
        >
          Omitir firma por ahora
        </button>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f0f4f4] px-6 text-center">
      <CheckCircle2 size={40} className="text-emerald-500" />
      <p className="text-lg font-semibold text-[#1a3a3a]">Solicitud enviada</p>
      <p className="text-sm text-gray-500">
        La solicitud de reposicion fue registrada. El supervisor y el autorizador podran revisarla.
      </p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f0f4f4] py-8 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="rounded-2xl bg-white border border-[#d1dede] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1a6b6b] mb-1">
            Solicitud de reposicion de dotacion
          </p>
          <h1 className="text-xl font-bold text-[#1a3a3a]">{spaceInfo?.campo}</h1>
          <p className="text-sm text-gray-400 mt-1">
            Registre la inspeccion y las reposiciones requeridas para cada empleado.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={e => { e.preventDefault(); setShowConfirm(true) }}
          className="flex flex-col gap-4"
        >
          {/* Datos inspeccion */}
          <div className="rounded-2xl bg-white border border-[#d1dede] p-5 shadow-sm flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Datos de la inspeccion</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">Numero de contrato *</label>
                <input
                  required
                  value={contrato}
                  onChange={e => setContrato(e.target.value)}
                  placeholder="CON-2026-001"
                  style={FIELD_STYLE}
                  onFocus={e => { e.target.style.borderColor = '#1a6b6b' }}
                  onBlur={e => { e.target.style.borderColor = '#d1d5db' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">Fecha de inspeccion *</label>
                <input
                  required
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  style={FIELD_STYLE}
                  onFocus={e => { e.target.style.borderColor = '#1a6b6b' }}
                  onBlur={e => { e.target.style.borderColor = '#d1d5db' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">Realizado por *</label>
                <input
                  required
                  value={inspector}
                  onChange={e => setInspector(e.target.value)}
                  placeholder="Nombre del inspector"
                  style={FIELD_STYLE}
                  onFocus={e => { e.target.style.borderColor = '#1a6b6b' }}
                  onBlur={e => { e.target.style.borderColor = '#d1d5db' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">Cargo *</label>
                <input
                  required
                  value={cargoInspector}
                  onChange={e => setCargoInspector(e.target.value)}
                  placeholder="HSE Campo"
                  style={FIELD_STYLE}
                  onFocus={e => { e.target.style.borderColor = '#1a6b6b' }}
                  onBlur={e => { e.target.style.borderColor = '#d1d5db' }}
                />
              </div>
            </div>
          </div>

          {/* Reposiciones */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1a6b6b' }}>
                Reposiciones ({reposiciones.length})
              </p>
            </div>

            {reposiciones.map((repo, i) => (
              <ReposicionFormRow
                key={i}
                repo={repo}
                index={i}
                token={token}
                onChange={updated => updateRepo(i, updated)}
                onRemove={() => removeRepo(i)}
              />
            ))}

            <button
              type="button"
              onClick={addRepo}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ border: '2px dashed #b3d4d4', color: '#1a6b6b', background: 'transparent' }}
            >
              <Plus size={16} />
              Agregar reposicion
            </button>
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-opacity"
            style={{ background: '#1a6b6b', color: '#fff', opacity: !isValid ? 0.5 : 1 }}
          >
            <Send size={18} />
            Revisar y enviar
          </button>
        </form>

        {/* Previous solicitudes */}
        {solicitudes.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: '#1a6b6b' }}>
              Solicitudes anteriores
            </p>
            {solicitudes.map(sol => <SolicitudCard key={sol.id} sol={sol} />)}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white overflow-hidden"
            style={{ border: '1px solid #d1dede', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}
          >
            <div className="px-6 py-5" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#1a6b6b] mb-1">
                Confirmar envio
              </p>
              <h2 className="text-base font-bold text-[#1a3a3a]">{spaceInfo?.campo}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {reposiciones.length} reposicion{reposiciones.length !== 1 ? 'es' : ''} &middot; {inspector}
              </p>
            </div>

            <div className="px-6 py-4 flex flex-col gap-2">
              {reposiciones.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: '#f0f7f7', color: '#1a6b6b' }}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.empleado_nombre || '—'}</p>
                    <p className="text-xs text-gray-400 truncate">{r.condicion_encontrada || '—'}</p>
                  </div>
                  {r.imagenes.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                      <ImageIcon size={11} />
                      {r.imagenes.length}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: '#fff', border: '1.5px solid #d1d5db', color: '#374151', opacity: submitting ? 0.5 : 1 }}
              >
                Corregir
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-opacity"
                style={{ background: '#1a6b6b', color: '#fff', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
