'use client'

import { use, useEffect, useRef, useState } from 'react'
import { Upload, CheckCircle2, XCircle, Loader2, WifiOff, Image as ImageIcon, Lock } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
const DB_NAME  = 'vault_queue'
const STORE    = 'pending'

// ── IndexedDB helpers ────────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
    req.onsuccess = () => res(req.result)
    req.onerror  = () => rej(req.error)
  })
}
async function dbAdd(token: string, file: File) {
  const db = await openDB()
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add({ token, file, name: file.name })
    tx.oncomplete = () => res()
    tx.onerror    = () => rej(tx.error)
  })
}
async function dbGetAll(): Promise<Array<{ id: number; token: string; file: File; name: string }>> {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = (db.transaction(STORE, 'readonly').objectStore(STORE) as IDBObjectStore).getAll()
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}
async function dbDelete(id: number) {
  const db = await openDB()
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => res()
    tx.onerror    = () => rej(tx.error)
  })
}

// ── Upload helper ────────────────────────────────────────────────────────────
async function uploadFiles(token: string, files: File[]): Promise<void> {
  const fd = new FormData()
  for (const f of files) fd.append('images', f)
  const res = await fetch(`${API_BASE}/vault/${token}/images`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Upload failed')
}

// ── Vault info type ──────────────────────────────────────────────────────────
interface VaultInfo {
  weekly_log_id:    string
  crew:             string
  field:            string
  week:             number
  year:             number
  is_closed?:       boolean
  used_image_urls?: string[]
  images: Array<{ id: string; url: string; original_name: string; is_assigned: boolean; uploaded_at: string }>
}

type FileStatus = 'pending' | 'uploading' | 'done' | 'error' | 'offline'
interface FileEntry { name: string; preview: string; status: FileStatus }

export default function VaultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [info,      setInfo]      = useState<VaultInfo | null>(null)
  const [notFound,  setNotFound]  = useState(false)
  const [closed,    setClosed]    = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [entries,   setEntries]   = useState<FileEntry[]>([])
  const [dragging,  setDragging]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Load vault info ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/vault/${token}`)
      .then((r) => { if (r.status === 404) { setNotFound(true); return null } return r.json() })
      .then((d) => {
        if (!d) return
        if (d.is_closed) setClosed(true)
        else setInfo(d)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  // ── Restore queue from IndexedDB on mount + flush when online ───────────
  useEffect(() => {
    async function restoreAndFlush() {
      const items = await dbGetAll()
      const mine  = items.filter((i) => i.token === token)
      if (mine.length > 0) {
        const restored: FileEntry[] = mine.map((i) => ({
          name:    i.name,
          preview: URL.createObjectURL(i.file),
          status:  'offline' as FileStatus,
        }))
        setEntries((prev) => {
          const existingNames = new Set(prev.map((e) => e.name))
          return [...prev, ...restored.filter((r) => !existingNames.has(r.name))]
        })
      }

      if (!navigator.onLine) return

      for (const item of mine) {
        try {
          await uploadFiles(item.token, [item.file])
          await dbDelete(item.id)
          setEntries((prev) => prev.map((e) => e.name === item.name ? { ...e, status: 'done' } : e))
        } catch {}
      }
    }

    async function flush() {
      const items = await dbGetAll()
      const mine  = items.filter((i) => i.token === token)
      for (const item of mine) {
        try {
          await uploadFiles(item.token, [item.file])
          await dbDelete(item.id)
          setEntries((prev) => prev.map((e) => e.name === item.name ? { ...e, status: 'done' } : e))
        } catch {}
      }
    }

    restoreAndFlush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [token])

  async function processFiles(files: File[]) {
    const newEntries: FileEntry[] = files.map((f) => ({
      name:    f.name,
      preview: URL.createObjectURL(f),
      status:  navigator.onLine ? 'uploading' : 'offline',
    }))
    setEntries((prev) => [...prev, ...newEntries])

    if (!navigator.onLine) {
      for (const f of files) await dbAdd(token, f)
      return
    }

    for (const f of files) {
      try {
        await uploadFiles(token, [f])
        setEntries((prev) => prev.map((e) => e.name === f.name && e.status === 'uploading' ? { ...e, status: 'done' } : e))
      } catch {
        setEntries((prev) => prev.map((e) => e.name === f.name && e.status === 'uploading' ? { ...e, status: 'error' } : e))
        await dbAdd(token, f)
      }
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    processFiles(Array.from(fileList))
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
      <p className="text-lg font-semibold text-[#1a3a3a]">Boveda cerrada</p>
      <p className="text-sm text-gray-500">El informe semanal ya fue generado.<br />Esta boveda ya no esta disponible.</p>
    </div>
  )

  const statusIcon: Record<FileStatus, React.ReactNode> = {
    pending:   <Loader2 size={14} className="animate-spin text-gray-400" />,
    uploading: <Loader2 size={14} className="animate-spin text-blue-500" />,
    done:      <CheckCircle2 size={14} className="text-emerald-500" />,
    error:     <XCircle size={14} className="text-red-400" />,
    offline:   <WifiOff size={14} className="text-amber-500" />,
  }
  const statusText: Record<FileStatus, string> = {
    pending:   'Pendiente',
    uploading: 'Subiendo...',
    done:      'Listo',
    error:     'Error - en cola',
    offline:   'Sin internet - en cola',
  }

  return (
    <div className="min-h-screen bg-[#f0f4f4] py-10 px-4">
      <div className="max-w-lg mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="rounded-2xl bg-white border border-[#d1dede] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1a6b6b] mb-1">Boveda de imagenes</p>
          <h1 className="text-xl font-bold text-[#1a3a3a]">{info?.crew}</h1>
          <p className="text-sm text-gray-500 mt-1">{info?.field} &middot; Semana {info?.week} / {info?.year}</p>
        </div>

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-all"
          style={{
            borderColor:  dragging ? '#1a6b6b' : '#b8cece',
            background:   dragging ? 'rgba(26,107,107,0.05)' : 'white',
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
            onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
          />
        </div>

        {/* File list */}
        {entries.length > 0 && (
          <div className="rounded-2xl bg-white border border-[#d1dede] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#d1dede]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Esta sesion</p>
            </div>
            <div className="divide-y divide-[#f0f4f4]">
              {entries.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                    <img src={entry.preview} alt={entry.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a3a3a] truncate">{entry.name}</p>
                    <p className="text-xs text-gray-400">{statusText[entry.status]}</p>
                  </div>
                  <div className="shrink-0">{statusIcon[entry.status]}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Already uploaded */}
        {(info?.images?.length ?? 0) > 0 && (
          <div className="rounded-2xl bg-white border border-[#d1dede] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#d1dede]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Ya subidas ({info!.images.length})
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1 p-2">
              {(() => {
                const usedUrls = new Set(info!.used_image_urls ?? [])
                return info!.images.map((img) => (
                  <div key={img.id} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '1' }}>
                    <img src={img.url} alt={img.original_name} className="w-full h-full object-cover" />
                    {usedUrls.has(img.url) && (
                      <div className="absolute inset-0 bg-black/30 flex items-end p-1">
                        <span className="text-[10px] font-semibold text-white bg-emerald-600 rounded px-1">Asignada</span>
                      </div>
                    )}
                  </div>
                ))
              })()}
            </div>
          </div>
        )}

        {(info?.images?.length ?? 0) === 0 && entries.length === 0 && (
          <div className="rounded-2xl bg-white border border-[#d1dede] p-8 text-center shadow-sm">
            <ImageIcon size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">Aun no hay imagenes subidas</p>
          </div>
        )}
      </div>
    </div>
  )
}
