'use client'

import { use, useEffect, useRef, useState } from 'react'
import { Upload, CheckCircle2, XCircle, Loader2, Image as ImageIcon, Lock, MapPin, Navigation, X, Map } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

async function uploadGroup(
  token: string,
  files: File[],
  lat: number,
  lng: number,
  via_name: string,
  comment: string,
): Promise<any> {
  const fd = new FormData()
  for (const f of files) fd.append('images', f)
  fd.append('lat', String(lat))
  fd.append('lng', String(lng))
  if (via_name) fd.append('via_name', via_name)
  if (comment)  fd.append('comment', comment)
  const res = await fetch(`${API_BASE}/via-vault/${token}/captures`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

// ── Map picker modal ──────────────────────────────────────────────────────────

function MapPickerModal({
  initialLat,
  initialLng,
  onConfirm,
  onClose,
}: {
  initialLat: number | null
  initialLng: number | null
  onConfirm:  (lat: number, lng: number) => void
  onClose:    () => void
}) {
  const mapRef      = useRef<HTMLDivElement>(null)
  const [pickedLat, setPickedLat] = useState(initialLat ?? 4.5)
  const [pickedLng, setPickedLng] = useState(initialLng ?? -74.0)

  useEffect(() => {
    if (!mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any
    let alive = true

    async function init() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (!alive || !mapRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const lat = initialLat ?? 4.5
      const lng = initialLng ?? -74.0
      map = L.map(mapRef.current).setView([lat, lng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        setPickedLat(pos.lat)
        setPickedLng(pos.lng)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng)
        setPickedLat(e.latlng.lat)
        setPickedLng(e.latlng.lng)
      })
    }

    init()
    return () => {
      alive = false
      if (map) map.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-lg bg-white rounded-t-2xl flex flex-col" style={{ maxHeight: '88vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#d1dede] shrink-0">
          <div className="flex items-center gap-2">
            <Map size={15} className="text-[#1a6b6b]" />
            <p className="text-sm font-semibold text-[#1a3a3a]">Seleccionar ubicacion</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div ref={mapRef} style={{ flex: 1, minHeight: 320 }} />
        <div className="p-4 flex flex-col gap-3 border-t border-[#d1dede] shrink-0">
          <p className="text-xs text-gray-400 text-center">Toca el mapa o arrastra el marcador para ajustar la posicion</p>
          <p className="text-xs text-center font-mono text-[#1a6b6b] tabular-nums">
            {pickedLat.toFixed(6)}, {pickedLng.toFixed(6)}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[#d1dede] text-gray-500">
              Cancelar
            </button>
            <button
              onClick={() => { onConfirm(pickedLat, pickedLng); onClose() }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#1a6b6b' }}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface VaultImage {
  id:            string
  url:           string
  original_name: string
}

interface VaultCaptureGroup {
  id:          string
  lat:         number | null
  lng:         number | null
  via_name:    string | null
  comment:     string | null
  captured_at: string
  images:      VaultImage[]
}

interface VaultInfo {
  monthly_log_id: string
  field:          string
  month:          number
  year:           number
  vault_token:    string
  capture_groups: VaultCaptureGroup[]
  is_closed?:     boolean
}

// ── Main page ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

export default function ViaVaultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const [info,     setInfo]     = useState<VaultInfo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [closed,   setClosed]   = useState(false)
  const [loading,  setLoading]  = useState(true)

  const [lat,        setLat]        = useState<number | null>(null)
  const [lng,        setLng]        = useState<number | null>(null)
  const [gpsErr,     setGpsErr]     = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [showMap,    setShowMap]    = useState(false)

  const [viaName,    setViaName]    = useState('')
  const [comment,    setComment]    = useState('')
  const [pending,    setPending]    = useState<File[]>([])
  const [previews,   setPreviews]   = useState<string[]>([])
  const [uploading,  setUploading]  = useState(false)
  const [uploadErr,  setUploadErr]  = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [dragging,   setDragging]   = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${API_BASE}/via-vault/${token}`)
      .then((r) => { if (r.status === 404) { setNotFound(true); return null } return r.json() })
      .then((d) => {
        if (!d) return
        if (d.is_closed) setClosed(true)
        else setInfo(d)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    setGpsLoading(true)
    if (!navigator.geolocation) { setGpsErr(true); setGpsLoading(false); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setGpsLoading(false) },
      ()    => { setGpsErr(true); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    const files = Array.from(fileList)
    setPending((prev) => [...prev, ...files])
    setPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    setUploadErr(null)
  }

  function removeFile(idx: number) {
    URL.revokeObjectURL(previews[idx])
    setPending((prev) => prev.filter((_, i) => i !== idx))
    setPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleUpload() {
    if (pending.length === 0 || lat === null || lng === null) return
    setUploading(true)
    setUploadErr(null)
    try {
      const result = await uploadGroup(token, pending, lat, lng, viaName, comment)
      if (result?.id) {
        setInfo((prev) => prev ? { ...prev, capture_groups: [...prev.capture_groups, result] } : prev)
      }
      previews.forEach((p) => URL.revokeObjectURL(p))
      setPending([])
      setPreviews([])
      setViaName('')
      setComment('')
      const n = result?.images?.length ?? pending.length
      setSuccessMsg(result?.message ?? `${n} foto${n !== 1 ? 's' : ''} subida${n !== 1 ? 's' : ''} correctamente`)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch {
      setUploadErr('Error al subir. Verifica tu conexion e intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  function requestGps() {
    setGpsLoading(true)
    setGpsErr(false)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setGpsLoading(false) },
      ()    => { setGpsErr(true); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
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
      <p className="text-sm text-gray-500">Este enlace no existe o ya expiro.</p>
    </div>
  )

  if (closed) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f0f4f4] px-6 text-center">
      <Lock size={40} className="text-amber-400" />
      <p className="text-lg font-semibold text-[#1a3a3a]">Registro cerrado</p>
      <p className="text-sm text-gray-500">El informe mensual ya fue generado.<br />Esta boveda ya no acepta nuevas capturas.</p>
    </div>
  )

  const canUpload = lat !== null && lng !== null

  return (
    <div className="min-h-screen bg-[#f0f4f4] py-10 px-4">
      <div className="max-w-lg mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="rounded-2xl bg-white border border-[#d1dede] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1a6b6b] mb-1">Boveda de vias</p>
          <h1 className="text-xl font-bold text-[#1a3a3a]">{info?.field}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {info ? MONTH_NAMES[(info.month ?? 1) - 1] : ''} {info?.year}
          </p>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-800">{successMsg}</p>
          </div>
        )}

        {/* GPS status */}
        <div className="rounded-2xl bg-white border border-[#d1dede] p-4 shadow-sm">
          {gpsLoading ? (
            <div className="flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-[#1a6b6b] shrink-0" />
              <p className="text-sm text-gray-500">Obteniendo ubicacion GPS...</p>
            </div>
          ) : gpsErr ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <XCircle size={18} className="text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#1a3a3a]">No se pudo obtener GPS</p>
                  <p className="text-xs text-gray-400">Permite el acceso a la ubicacion o selecciona en el mapa.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={requestGps} className="flex-1 py-2 rounded-xl text-xs font-semibold border border-[#d1dede] text-gray-600">
                  Reintentar GPS
                </button>
                <button
                  onClick={() => setShowMap(true)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                  style={{ background: '#1a6b6b' }}
                >
                  <Map size={13} /> Seleccionar en mapa
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Navigation size={18} className="text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#1a3a3a]">Ubicacion activa</p>
                <p className="text-xs text-gray-400 font-mono tabular-nums">{lat?.toFixed(5)}, {lng?.toFixed(5)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={requestGps} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#d1dede] text-gray-500">
                  Actualizar
                </button>
                <button
                  onClick={() => setShowMap(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1"
                  style={{ background: '#1a6b6b' }}
                >
                  <Map size={12} /> Mapa
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Via info */}
        <div className="rounded-2xl bg-white border border-[#d1dede] p-4 shadow-sm flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Informacion de la via</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre de la via (opcional)</label>
            <input
              type="text"
              value={viaName}
              onChange={(e) => setViaName(e.target.value)}
              placeholder="Ej: Via principal entrada norte"
              className="w-full px-3 py-2 rounded-lg text-sm border border-[#d1dede] outline-none focus:border-[#1a6b6b] text-[#1a3a3a]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Comentario (opcional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Observaciones sobre el estado de la via..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm border border-[#d1dede] outline-none focus:border-[#1a6b6b] text-[#1a3a3a] resize-none"
            />
          </div>
        </div>

        {/* Upload zone */}
        {!canUpload ? (
          <div className="rounded-2xl border-2 border-dashed border-[#b8cece] bg-white flex flex-col items-center justify-center gap-3 py-10">
            <MapPin size={28} className="text-gray-300" />
            <p className="text-sm text-gray-400 text-center px-4">Necesitas una ubicacion para subir fotos</p>
            <button
              onClick={() => setShowMap(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5"
              style={{ background: '#1a6b6b' }}
            >
              <Map size={13} /> Seleccionar ubicacion en mapa
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-all"
            style={{
              borderColor: dragging ? '#1a6b6b' : '#b8cece',
              background:  dragging ? 'rgba(26,107,107,0.05)' : 'white',
            }}
          >
            <Upload size={28} className="text-[#1a6b6b]" />
            <div className="text-center">
              <p className="text-sm font-semibold text-[#1a3a3a]">Seleccionar fotos</p>
              <p className="text-xs text-gray-400 mt-0.5">o arrastra aqui &middot; max 20 a la vez</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
            />
          </div>
        )}

        {/* Pending files + Cargar button */}
        {pending.length > 0 && (
          <div className="rounded-2xl bg-white border border-[#d1dede] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#d1dede] flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Por subir ({pending.length})
              </p>
              <button
                onClick={handleUpload}
                disabled={uploading || !canUpload}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity"
                style={{ background: '#1a6b6b', opacity: uploading ? 0.6 : 1 }}
              >
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {uploading ? 'Subiendo...' : 'Cargar'}
              </button>
            </div>
            <div className="divide-y divide-[#f0f4f4]">
              {pending.map((file, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                    <img src={previews[i]} alt={file.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a3a3a] truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">Pendiente</p>
                  </div>
                  {!uploading && (
                    <button
                      onClick={() => removeFile(i)}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {uploadErr && (
              <div className="px-4 py-3 border-t border-[#d1dede] flex items-center gap-2">
                <XCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-500">{uploadErr}</p>
              </div>
            )}
          </div>
        )}

        {/* Existing capture groups */}
        {(info?.capture_groups?.length ?? 0) > 0 && (
          <div className="rounded-2xl bg-white border border-[#d1dede] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#d1dede]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Ya subidas ({info!.capture_groups.length} grupo{info!.capture_groups.length !== 1 ? 's' : ''})
              </p>
            </div>
            <div className="flex flex-col divide-y divide-[#f0f4f4]">
              {info!.capture_groups.map((group) => (
                <div key={group.id} className="p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {group.via_name && (
                      <span className="text-xs font-semibold text-[#1a3a3a]">{group.via_name}</span>
                    )}
                    {group.lat !== null && group.lng !== null && (
                      <div className="flex items-center gap-1 ml-auto">
                        <MapPin size={9} className="text-gray-400" />
                        <span className="text-[9px] font-mono text-gray-400">
                          {Number(group.lat).toFixed(4)}, {Number(group.lng).toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                  {group.comment && (
                    <p className="text-xs text-gray-400">{group.comment}</p>
                  )}
                  <div className="grid grid-cols-4 gap-1">
                    {group.images.map((img) => (
                      <div key={img.id} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '1' }}>
                        <img src={img.url} alt={img.original_name} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(info?.capture_groups?.length ?? 0) === 0 && pending.length === 0 && (
          <div className="rounded-2xl bg-white border border-[#d1dede] p-8 text-center shadow-sm">
            <ImageIcon size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">Aun no hay capturas subidas</p>
          </div>
        )}
      </div>

      {showMap && (
        <MapPickerModal
          initialLat={lat}
          initialLng={lng}
          onConfirm={(la, lo) => { setLat(la); setLng(lo); setGpsErr(false) }}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  )
}
